import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const docker = process.env["DOCKER_BIN"] ?? (
  existsSync("/Applications/Docker.app/Contents/Resources/bin/docker")
    ? "/Applications/Docker.app/Contents/Resources/bin/docker"
    : "docker"
);
const containers = spawnSync(docker, ["ps", "--format", "{{.Names}}"], { encoding: "utf8" });
if (containers.status !== 0) throw new Error("Local Docker engine is required");
const databaseContainer = containers.stdout.split(/\r?\n/u).find((name) => name.startsWith("supabase_db_"));
if (databaseContainer === undefined) throw new Error("Local Supabase database is not running");

const viewerId = "77777777-7777-4777-8777-777777777777";
const targetId = "88888888-8888-4888-8888-888888888888";
const otherId = "99999999-9999-4999-8999-999999999999";
const sql = `
begin;
insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('${viewerId}', 'authenticated', 'authenticated', 'safety-viewer@example.invalid', '{}', '{"nickname":"안전여행자"}', now(), now()),
  ('${targetId}', 'authenticated', 'authenticated', 'safety-target@example.invalid', '{}', '{"nickname":"신고대상"}', now(), now()),
  ('${otherId}', 'authenticated', 'authenticated', 'safety-other@example.invalid', '{}', '{"nickname":"다른사용자"}', now(), now());
insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select md5('report-target-' || number::text)::uuid, 'authenticated', 'authenticated',
       'report-target-' || number::text || '@example.invalid', '{}', '{}', now(), now()
from generate_series(1, 10) as number;
insert into public.profiles(id, nickname, bio, avatar_url)
values
  ('${viewerId}', '안전여행자', '', ''),
  ('${targetId}', '신고대상', '', ''),
  ('${otherId}', '다른사용자', '', '');
insert into public.profiles(id, nickname, bio, avatar_url)
select auth_user.id, split_part(auth_user.email, '@', 1), '', ''
from auth.users as auth_user
where auth_user.email like 'report-target-%@example.invalid';
insert into public.photos(id, owner_id, visibility, shared, storage_path)
values
  ('safety-target-photo', '${targetId}', 'public', true, '${targetId}/target.jpg'),
  ('safety-viewer-photo', '${viewerId}', 'public', true, '${viewerId}/viewer.jpg');

select set_config('request.jwt.claim.sub', '${targetId}', true);
set local role authenticated;
insert into public.comments(photo_id, author_id, text)
values ('safety-target-photo', '${targetId}', 'target comment');
reset role;

set local role anon;
select 'anon_photo_before=' || count(*) from public.photos where id = 'safety-target-photo';
select 'anon_profile_before=' || count(*) from public.profiles where id = '${targetId}';
select 'anon_comment_before=' || count(*) from public.comments where photo_id = 'safety-target-photo';
reset role;

select set_config('request.jwt.claim.sub', '${viewerId}', true);
set local role authenticated;
insert into public.content_reports(reporter_id, reported_user_id, photo_id, reason, details, created_at)
values ('${viewerId}', '${targetId}', 'safety-target-photo', 'harassment', '  repeated abuse  ', '2000-01-01T00:00:00Z');
select 'report_trimmed=' || details from public.content_reports where photo_id = 'safety-target-photo';
select 'report_server_timed=' || (created_at > now() - interval '1 minute')::int from public.content_reports where photo_id = 'safety-target-photo';
do $$
begin
  insert into public.content_reports(reporter_id, reported_user_id, photo_id, reason)
  values ('${viewerId}', '${targetId}', 'safety-target-photo', 'spam');
  raise exception 'duplicate_report_unexpectedly_succeeded';
exception when unique_violation then null;
end
$$;
select 'duplicate_report_rejected=1';
insert into public.content_reports(reporter_id, reported_user_id, reason)
select '${viewerId}', profile.id, 'other'
from public.profiles as profile
where profile.nickname like 'report-target-%'
order by profile.nickname
limit 9;
do $$
declare final_target uuid;
begin
  select profile.id into final_target
  from public.profiles as profile
  where profile.nickname like 'report-target-%'
    and not exists (
      select 1 from public.content_reports as existing_report
      where existing_report.reported_user_id = profile.id
    )
  limit 1;
  insert into public.content_reports(reporter_id, reported_user_id, reason, created_at)
  values ('${viewerId}', final_target, 'other', '2000-01-01T00:00:00Z');
  raise exception 'rate_limit_unexpectedly_succeeded';
exception when program_limit_exceeded then null;
end
$$;
select 'report_rate_rejected=1';

insert into public.user_blocks(blocker_id, blocked_id, blocked_display_name, created_at)
values ('${viewerId}', '${targetId}', 'spoofed', '2000-01-01T00:00:00Z');
select 'block_snapshot=' || blocked_display_name from public.user_blocks where blocked_id = '${targetId}';
select 'block_server_timed=' || (created_at > now() - interval '1 minute')::int from public.user_blocks where blocked_id = '${targetId}';
select 'viewer_blocked_photo=' || count(*) from public.photos where id = 'safety-target-photo';
select 'viewer_blocked_profile=' || count(*) from public.profiles where id = '${targetId}';
select 'viewer_blocked_comment=' || count(*) from public.comments where photo_id = 'safety-target-photo';
reset role;

select set_config('request.jwt.claim.sub', '${otherId}', true);
set local role authenticated;
select 'other_report_rows=' || count(*) from public.content_reports where reporter_id = '${viewerId}';
with deleted as (delete from public.user_blocks where blocked_id = '${targetId}' returning blocked_id)
select 'other_unblock_count=' || count(*) from deleted;
reset role;

set local role anon;
select 'anon_photo_after=' || count(*) from public.photos where id = 'safety-target-photo';
select 'anon_comment_after=' || count(*) from public.comments where photo_id = 'safety-target-photo';
reset role;

select set_config('request.jwt.claim.sub', '${viewerId}', true);
set local role authenticated;
with deleted as (delete from public.user_blocks where blocked_id = '${targetId}' returning blocked_id)
select 'own_unblock_count=' || count(*) from deleted;
select 'viewer_photo_after_unblock=' || count(*) from public.photos where id = 'safety-target-photo';
reset role;

select 'anon_blocks_select=' || has_table_privilege('anon', 'public.user_blocks', 'SELECT')::int;
select 'auth_reports_update=' || has_table_privilege('authenticated', 'public.content_reports', 'UPDATE')::int;
select 'auth_reports_delete=' || has_table_privilege('authenticated', 'public.content_reports', 'DELETE')::int;
select 'report_trigger_execute=' || has_function_privilege('authenticated', 'public.enforce_content_report_submission()', 'EXECUTE')::int;
select 'block_trigger_execute=' || has_function_privilege('authenticated', 'public.enforce_user_block_insert()', 'EXECUTE')::int;
rollback;
`;

const result = spawnSync(docker, [
  "exec", "-i", databaseContainer,
  "psql", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"
], { encoding: "utf8", input: sql });
if (result.status !== 0) throw new Error(`Local content safety policy query failed: ${result.stderr.trim()}`);
const evidence = new Set(result.stdout.split(/\r?\n/u).filter((line) => line.includes("=")));
for (const expected of [
  "anon_photo_before=1", "anon_profile_before=1", "anon_comment_before=1",
  "report_trimmed=repeated abuse", "report_server_timed=1", "duplicate_report_rejected=1", "report_rate_rejected=1",
  "block_snapshot=신고대상", "block_server_timed=1",
  "viewer_blocked_photo=0", "viewer_blocked_profile=0", "viewer_blocked_comment=0",
  "other_report_rows=0", "other_unblock_count=0", "anon_photo_after=1", "anon_comment_after=1",
  "own_unblock_count=1", "viewer_photo_after_unblock=1",
  "anon_blocks_select=0", "auth_reports_update=0", "auth_reports_delete=0",
  "report_trigger_execute=0", "block_trigger_execute=0"
]) {
  if (!evidence.has(expected)) throw new Error(`Missing local content safety decision: ${expected}`);
}

console.log("[content-safety] Local report isolation/rate limits and viewer-specific block/unblock filtering passed.");
