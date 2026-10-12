create schema if not exists private;

-- Auth stays private. These checks use the current database state, not stale JWT roles.
create or replace function private.account_is_active()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from auth.users where id = (select auth.uid())
    and (banned_until is null or banned_until <= now())); $$;
create or replace function private.account_is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from auth.users where id = (select auth.uid())
    and raw_app_meta_data->>'role' = 'admin'
    and (banned_until is null or banned_until <= now())); $$;
revoke all on function private.account_is_active(), private.account_is_admin() from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;
grant execute on function private.account_is_active(), private.account_is_admin() to authenticated, service_role;

create table public.account_moderation_events (
    id uuid primary key,
    target_user_id uuid not null references auth.users(id) on delete cascade,
    actor_id uuid references auth.users(id) on delete set null,
    action text not null check(action in ('warning','ban','unban')),
    reason text not null check(char_length(btrim(reason)) between 5 and 500),
    duration_hours integer check(duration_hours in (24,168,720,876000)),
    state text not null default 'pending' check(state in ('pending','completed','failed')),
    banned_until timestamptz,
    created_at timestamptz not null default now(),
    acknowledged_at timestamptz
);
create index account_moderation_target_created_idx on public.account_moderation_events(target_user_id, created_at desc);
create index account_moderation_actor_idx on public.account_moderation_events(actor_id);
create unique index account_moderation_pending_idx on public.account_moderation_events(target_user_id) where state = 'pending';
alter table public.account_moderation_events enable row level security;
revoke all on public.account_moderation_events from public, anon, authenticated;
grant select, update(acknowledged_at) on public.account_moderation_events to authenticated;
grant all on public.account_moderation_events to service_role;
create policy moderation_read_own on public.account_moderation_events for select to authenticated
using(target_user_id = (select auth.uid()) and state = 'completed');
create policy moderation_acknowledge_own_warning on public.account_moderation_events for update to authenticated
using(target_user_id = (select auth.uid()) and action = 'warning' and state = 'completed')
with check(target_user_id = (select auth.uid()) and action = 'warning' and state = 'completed');

-- Only the verified Edge Function's service client can call the account directory.
create or replace function private.admin_account_page(p_search text, p_page integer, p_status text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb; total_count integer;
begin
    if p_page < 1 or p_page > 100000 or char_length(p_search) > 100 or p_status not in ('all','active','banned') then
        raise exception 'Invalid account filters' using errcode = '22023';
    end if;
    select count(*) into total_count from auth.users u left join public.profiles pr on pr.id = u.id
    where (p_search = '' or position(lower(p_search) in lower(coalesce(u.email,'') || ' ' || coalesce(pr.nickname,''))) > 0)
      and (p_status = 'all' or (p_status = 'banned') = coalesce(u.banned_until > now(),false));
    select coalesce(jsonb_agg(row_data order by last_login desc nulls last, account_id),'[]'::jsonb) into result
    from (
        select u.id as account_id,u.last_sign_in_at as last_login,jsonb_build_object(
            'id',u.id,'email',u.email,'nickname',coalesce(nullif(pr.nickname,''),'이름 없음'),
            'created_at',u.created_at,'last_sign_in_at',u.last_sign_in_at,
            'providers',coalesce(u.raw_app_meta_data->'providers','[]'::jsonb),
            'role',coalesce(u.raw_app_meta_data->>'role','member'),'banned_until',u.banned_until,
            'photo_count',(select count(*) from public.photos p where p.owner_id=u.id),
            'public_count',(select count(*) from public.photos p where p.owner_id=u.id and p.visibility='public')
        ) as row_data from auth.users u left join public.profiles pr on pr.id=u.id
        where (p_search='' or position(lower(p_search) in lower(coalesce(u.email,'') || ' ' || coalesce(pr.nickname,'')))>0)
          and (p_status='all' or (p_status='banned')=coalesce(u.banned_until>now(),false))
        order by u.last_sign_in_at desc nulls last,u.id limit 25 offset (p_page-1)*25
    ) t;
    return jsonb_build_object('accounts',result,'total',total_count,'page',p_page,'pageSize',25);
end;
$$;
revoke all on function private.admin_account_page(text,integer,text) from public, anon, authenticated;
grant execute on function private.admin_account_page(text,integer,text) to service_role;
create or replace function public.admin_account_page(p_search text default '',p_page integer default 1,p_status text default 'all')
returns jsonb language sql stable security invoker set search_path = ''
as $$ select private.admin_account_page(p_search,p_page,p_status); $$;
revoke all on function public.admin_account_page(text,integer,text) from public, anon, authenticated;
grant execute on function public.admin_account_page(text,integer,text) to service_role;

create or replace function private.reject_banned_account_write()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
    if current_setting('role',true) = 'authenticated' and not private.account_is_active() then
        raise exception 'Account access is restricted' using errcode = '42501';
    end if;
    if tg_op = 'DELETE' then return old; end if;
    return new;
end;
$$;
revoke all on function private.reject_banned_account_write() from public,anon,authenticated;

-- Restrictive policies never grant ownership access; triggers also guard definer RPC writes.
do $$ declare name text; begin
    foreach name in array array['photos','albums','album_photos','profiles','comments','user_likes','user_blocks','content_reports','product_feedback','photo_private_locations'] loop
        execute format('create policy active_account_access on public.%I as restrictive for all to authenticated using ((select private.account_is_active())) with check ((select private.account_is_active()))',name);
        execute format('create trigger reject_banned_account_write before insert or update or delete on public.%I for each row execute function private.reject_banned_account_write()',name);
    end loop;
end; $$;
create policy active_account_storage_access on storage.objects as restrictive for all to authenticated
using((select private.account_is_active())) with check((select private.account_is_active()));

drop policy "users read own feedback and admins read all feedback" on public.product_feedback;
create policy "users read own feedback and admins read all feedback" on public.product_feedback for select to authenticated
using(user_id=(select auth.uid()) or (select private.account_is_admin()));
drop policy "admins update feedback status" on public.product_feedback;
create policy "admins update feedback status" on public.product_feedback for update to authenticated
using((select private.account_is_admin())) with check((select private.account_is_admin()));
