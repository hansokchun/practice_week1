-- Administrator-entered organization billing measurements, not estimated from visitors.
-- Neither table nor RPC is available to browser roles. Edge verifies fresh Auth admin state.
create table private.quota_billing_snapshot (
    singleton boolean primary key default true check (singleton),
    period_start date not null,
    period_end date not null,
    egress_gb numeric check (egress_gb between 0 and 1000000000000),
    cached_egress_gb numeric check (cached_egress_gb between 0 and 1000000000000),
    mau bigint check (mau between 0 and 1000000000000),
    function_calls bigint check (function_calls between 0 and 1000000000000),
    observed_at timestamptz not null default now(),
    updated_by uuid not null,
    check (period_end > period_start and period_end - period_start <= 35),
    check (num_nonnulls(egress_gb, cached_egress_gb, mau, function_calls) > 0)
);
alter table private.quota_billing_snapshot enable row level security;
revoke all on private.quota_billing_snapshot from public, anon, authenticated;
grant select, insert, update on private.quota_billing_snapshot to service_role;

create or replace function public.admin_quota_usage()
returns jsonb language sql stable security invoker set search_path = '' as $$
    select jsonb_build_object(
        'measured_at', now(),
        'database_bytes', pg_database_size(current_database()),
        'storage_bytes', case when count(*) filter (where metadata->>'size' is null or metadata->>'size' !~ '^[0-9]+$') > 0 then null
            else coalesce(sum((metadata->>'size')::numeric) filter (where metadata->>'size' ~ '^[0-9]+$'), 0) end,
        'snapshot', (select to_jsonb(s) - 'updated_by' - 'singleton' from private.quota_billing_snapshot s where singleton)
    ) from storage.objects;
$$;
revoke all on function public.admin_quota_usage() from public, anon, authenticated;
grant execute on function public.admin_quota_usage() to service_role;

create or replace function public.admin_quota_snapshot_save(p_snapshot jsonb, p_actor_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
    start_date date := (p_snapshot->>'period_start')::date;
    end_date date := (p_snapshot->>'period_end')::date;
begin
    -- service_role is the only caller; Edge obtains p_actor_id from its fresh Auth admin lookup.
    -- Do not grant direct auth.users access just to duplicate that authorization check here.
    if start_date is null or end_date is null or start_date > (now() at time zone 'UTC')::date
        or end_date <= (now() at time zone 'UTC')::date then
        raise exception 'invalid_period' using errcode = '22023';
    end if;
    insert into private.quota_billing_snapshot (singleton, period_start, period_end, egress_gb, cached_egress_gb, mau, function_calls, observed_at, updated_by)
    values (true, start_date, end_date, (p_snapshot->>'egress_gb')::numeric, (p_snapshot->>'cached_egress_gb')::numeric,
        (p_snapshot->>'mau')::bigint, (p_snapshot->>'function_calls')::bigint, now(), p_actor_id)
    on conflict (singleton) do update set period_start = excluded.period_start, period_end = excluded.period_end,
        egress_gb = excluded.egress_gb, cached_egress_gb = excluded.cached_egress_gb, mau = excluded.mau,
        function_calls = excluded.function_calls, observed_at = excluded.observed_at, updated_by = excluded.updated_by;
    return jsonb_build_object('saved', true);
end;
$$;
revoke all on function public.admin_quota_snapshot_save(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.admin_quota_snapshot_save(jsonb, uuid) to service_role;
