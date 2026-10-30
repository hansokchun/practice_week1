create schema if not exists private;

create table private.site_activity_daily (
    day date primary key,
    samples bigint not null check(samples between 1 and 10000),
    visible_seconds bigint not null check(visible_seconds between samples and samples * 3600)
);
create table private.site_activity_config (
    singleton boolean primary key default true check(singleton),
    ingest_key_hash text not null check(ingest_key_hash ~ '^[0-9a-f]{64}$')
);
alter table private.site_activity_daily enable row level security;
alter table private.site_activity_config enable row level security;
revoke all on private.site_activity_daily from public, anon, authenticated;
revoke all on private.site_activity_config from public, anon, authenticated;
grant all on private.site_activity_daily, private.site_activity_config to service_role;

-- Only daily totals are retained. The random 256-bit ingestion secret is provisioned
-- separately: store its lowercase SHA-256 hex digest here, never the raw secret.
create or replace function private.record_site_activity(p_seconds integer, p_ingest_key text)
returns boolean language plpgsql volatile security definer set search_path = ''
as $$
declare
    stored_hash text;
    accepted_samples bigint;
    today date := (statement_timestamp() at time zone 'Asia/Seoul')::date;
begin
    if p_seconds is null or p_seconds < 1 or p_seconds > 3600
        or p_ingest_key is null or octet_length(p_ingest_key) < 32 or octet_length(p_ingest_key) > 256 then
        return false;
    end if;
    select ingest_key_hash into stored_hash from private.site_activity_config where singleton;
    if stored_hash is null or encode(extensions.digest(p_ingest_key, 'sha256'), 'hex') <> stored_hash then
        return false;
    end if;

    -- The conflict-row lock makes the daily cap atomic for concurrent requests.
    insert into private.site_activity_daily(day, samples, visible_seconds)
    values(today, 1, p_seconds)
    on conflict(day) do update set
        samples = private.site_activity_daily.samples + 1,
        visible_seconds = private.site_activity_daily.visible_seconds + excluded.visible_seconds
    where private.site_activity_daily.samples < 10000
    returning samples into accepted_samples;
    if accepted_samples is null then return false; end if;
    if accepted_samples = 1 then
        delete from private.site_activity_daily where day < today - 90;
    end if;
    return true;
end;
$$;
revoke all on function private.record_site_activity(integer, text) from public, anon, authenticated;
grant usage on schema private to anon, service_role;
grant execute on function private.record_site_activity(integer, text) to anon, service_role;

create or replace function public.record_site_activity(p_seconds integer, p_ingest_key text)
returns boolean language sql volatile security invoker set search_path = ''
as $$ select private.record_site_activity(p_seconds, p_ingest_key); $$;
revoke all on function public.record_site_activity(integer, text) from public, anon, authenticated;
grant execute on function public.record_site_activity(integer, text) to anon, service_role;

-- The Edge Function verifies the latest Auth admin state before its service client
-- calls this RPC. Counts contain no individual account or photo data.
-- Members include admins and exclude anonymous accounts. New registrations use
-- the same member definition and rolling 7/30-day timestamp windows through now.
-- Daily counts and dwell cover today plus the previous 29 calendar dates in KST.
create or replace function private.admin_site_overview()
returns jsonb language sql stable security definer set search_path = ''
as $$
with bounds as (
    select now() as as_of, (now() at time zone 'Asia/Seoul')::date as today
), account_totals as (
    select jsonb_build_object(
        'total', count(*),
        'members', count(*) filter(where u.is_anonymous is not true),
        'new7d', count(*) filter(where u.is_anonymous is not true and u.created_at >= b.as_of - interval '7 days' and u.created_at <= b.as_of),
        'new30d', count(*) filter(where u.is_anonymous is not true and u.created_at >= b.as_of - interval '30 days' and u.created_at <= b.as_of)
    ) as data from auth.users u cross join bounds b
), photo_totals as (
    select jsonb_build_object(
        'total', count(*),
        'public', count(*) filter(where p.visibility = 'public'),
        'new7d', count(*) filter(where p.created_at >= b.as_of - interval '7 days' and p.created_at <= b.as_of),
        'new30d', count(*) filter(where p.created_at >= b.as_of - interval '30 days' and p.created_at <= b.as_of),
        'owners', count(distinct p.owner_id)
    ) as data from public.photos p cross join bounds b
), registration_days as (
    select (u.created_at at time zone 'Asia/Seoul')::date as day, count(*) as registrations
    from auth.users u cross join bounds b
    where u.is_anonymous is not true
        and u.created_at >= ((b.today - 29)::timestamp at time zone 'Asia/Seoul') and u.created_at <= b.as_of
    group by 1
), upload_days as (
    select (p.created_at at time zone 'Asia/Seoul')::date as day, count(*) as uploads
    from public.photos p cross join bounds b
    where p.created_at >= ((b.today - 29)::timestamp at time zone 'Asia/Seoul') and p.created_at <= b.as_of
    group by 1
), days as (
    select b.today - n as day from bounds b cross join generate_series(0, 29) as n
), daily as (
    select jsonb_agg(jsonb_build_object('date', to_char(d.day, 'YYYY-MM-DD'),
        'registrations', coalesce(r.registrations, 0), 'uploads', coalesce(u.uploads, 0)) order by d.day) as data
    from days d left join registration_days r using(day) left join upload_days u using(day)
), dwell as (
    select coalesce(sum(a.samples), 0) as samples, coalesce(sum(a.visible_seconds), 0) as seconds
    from private.site_activity_daily a cross join bounds b where a.day between b.today - 29 and b.today
)
select jsonb_build_object('accounts', a.data, 'photos', p.data, 'daily', d.data,
    'dwell', jsonb_build_object('sample_count', w.samples, 'average_seconds',
        case when w.samples > 0 then round(w.seconds / w.samples, 1) else 0 end,
        'total_seconds', w.seconds, 'days', 30))
from account_totals a cross join photo_totals p cross join daily d cross join dwell w;
$$;
revoke all on function private.admin_site_overview() from public, anon, authenticated;
grant execute on function private.admin_site_overview() to service_role;

create or replace function public.admin_site_overview()
returns jsonb language sql stable security invoker set search_path = ''
as $$ select private.admin_site_overview(); $$;
revoke all on function public.admin_site_overview() from public, anon, authenticated;
grant execute on function public.admin_site_overview() to service_role;
