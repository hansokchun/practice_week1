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

const ownerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ownerPath = `${ownerId}/avatar-11111111-1111-4111-8111-111111111111.jpg`;
const sql = `
begin;
insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('${ownerId}', 'authenticated', 'authenticated', 'profile-owner@example.invalid', '{}', '{}', now(), now()),
  ('${otherId}', 'authenticated', 'authenticated', 'profile-other@example.invalid', '{}', '{}', now(), now());
insert into public.profiles(id, nickname, bio, avatar_url)
values ('${ownerId}', ' 프로필 소유자 ', ' 소개 ', ''), ('${otherId}', '다른 사용자', '', '');
select 'profile_trimmed=' || nickname || ':' || bio from public.profiles where id = '${ownerId}';

select set_config('request.jwt.claim.sub', '${ownerId}', true);
set local role authenticated;
update public.profiles set nickname = ' 새 이름 ', bio = ' 새 소개 ', avatar_path = '${ownerPath}' where id = '${ownerId}';
select 'owner_profile=' || nickname || ':' || bio || ':' || avatar_path from public.profiles where id = '${ownerId}';
insert into storage.objects(bucket_id, name, owner_id, metadata)
values ('avatars', '${ownerPath}', '${ownerId}', '{"mimetype":"image/jpeg","size":128}'::jsonb);
select 'owner_storage_rows=' || count(*) from storage.objects where bucket_id = 'avatars';
do $$
begin
  insert into storage.objects(bucket_id, name, owner_id, metadata)
  values ('avatars', '${otherId}/avatar-22222222-2222-4222-8222-222222222222.jpg', '${ownerId}', '{"mimetype":"image/jpeg","size":128}'::jsonb);
  raise exception 'cross_folder_upload_unexpectedly_succeeded';
exception when insufficient_privilege then null;
end
$$;
select 'cross_folder_upload_rejected=1';
reset role;

select set_config('request.jwt.claim.sub', '${otherId}', true);
set local role authenticated;
select 'other_storage_rows=' || count(*) from storage.objects where bucket_id = 'avatars';
with changed as (update public.profiles set nickname = '침입' where id = '${ownerId}' returning id)
select 'other_profile_update=' || count(*) from changed;
reset role;

set local role anon;
select 'anon_profile_rows=' || count(*) from public.profiles where id = '${ownerId}';
reset role;

select set_config('request.jwt.claim.sub', '${ownerId}', true);
set local role authenticated;
do $$
begin
  update public.profiles set avatar_path = '${ownerId}/../unsafe.jpg' where id = '${ownerId}';
  raise exception 'unsafe_avatar_path_unexpectedly_succeeded';
exception when check_violation or invalid_parameter_value then null;
end
$$;
select 'unsafe_avatar_path_rejected=1';
reset role;

select 'bucket_config=' || public::int || ':' || file_size_limit || ':' || array_to_string(allowed_mime_types, ',')
from storage.buckets where id = 'avatars';
select 'auth_storage_update_policy=' || count(*) from pg_policies
where schemaname = 'storage' and tablename = 'objects' and cmd = 'UPDATE' and policyname like 'mobile_avatar_%';
select 'auth_storage_delete_policy=' || count(*) from pg_policies
where schemaname = 'storage' and tablename = 'objects' and cmd = 'DELETE'
  and policyname = 'mobile_avatar_owner_delete'
  and qual like '%owner_id%'
  and qual like '%auth.uid()%';
select 'trigger_execute=' || has_function_privilege('authenticated', 'public.enforce_mobile_profile_fields()', 'EXECUTE')::int;
rollback;
`;

const result = spawnSync(docker, [
  "exec", "-i", databaseContainer,
  "psql", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"
], { encoding: "utf8", input: sql });
if (result.status !== 0) throw new Error(`Local profile policy query failed: ${result.stderr.trim()}`);
const evidence = new Set(result.stdout.split(/\r?\n/u).filter((line) => line.includes("=")));
for (const expected of [
  "profile_trimmed=프로필 소유자:소개",
  `owner_profile=새 이름:새 소개:${ownerPath}`,
  "owner_storage_rows=1",
  "cross_folder_upload_rejected=1",
  "other_storage_rows=0",
  "other_profile_update=0",
  "anon_profile_rows=1",
  "unsafe_avatar_path_rejected=1",
  "bucket_config=1:2097152:image/jpeg",
  "auth_storage_update_policy=0",
  "auth_storage_delete_policy=1",
  "trigger_execute=0"
]) {
  if (!evidence.has(expected)) throw new Error(`Missing local profile policy decision: ${expected}`);
}

console.log("[profile-policy] Local profile normalization, avatar bucket limits, owner isolation, and cleanup rights passed.");
