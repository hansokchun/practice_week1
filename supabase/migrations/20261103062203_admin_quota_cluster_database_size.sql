-- Supabase reports the sum of ALL cluster databases, including template0/template1.
-- https://supabase.com/docs/guides/platform/database-size
create or replace function public.admin_quota_usage()
returns jsonb language sql stable security invoker set search_path = '' as $$
    select jsonb_build_object(
        'measured_at', now(),
        'database_bytes', (select sum(pg_database_size(datname)) from pg_database),
        'storage_bytes', case when count(*) filter (where metadata->>'size' is null or metadata->>'size' !~ '^[0-9]+$') > 0 then null
            else coalesce(sum((metadata->>'size')::numeric) filter (where metadata->>'size' ~ '^[0-9]+$'), 0) end,
        'snapshot', (select to_jsonb(s) - 'updated_by' - 'singleton' from private.quota_billing_snapshot s where singleton)
    ) from storage.objects;
$$;
revoke all on function public.admin_quota_usage() from public, anon, authenticated;
grant execute on function public.admin_quota_usage() to service_role;
