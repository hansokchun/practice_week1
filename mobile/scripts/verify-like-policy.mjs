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

const viewerId = "33333333-3333-4333-8333-333333333333";
const otherId = "44444444-4444-4444-8444-444444444444";
const sql = `
begin;
insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('${viewerId}', 'authenticated', 'authenticated', 'like-viewer@example.invalid', '{}', '{}', now(), now()),
  ('${otherId}', 'authenticated', 'authenticated', 'like-owner@example.invalid', '{}', '{}', now(), now());
insert into public.photos(id, owner_id, visibility, shared, storage_path)
values
  ('like-policy-public', '${otherId}', 'public', true, '${otherId}/public.jpg'),
  ('like-policy-private', '${otherId}', 'private', false, '${otherId}/private.jpg');

select set_config('request.jwt.claim.sub', '${viewerId}', true);
set local role authenticated;
select 'like_count=' || public.set_photo_like('like-policy-public', true);
select 'own_like_rows=' || count(*) from public.user_likes where photo_id = 'like-policy-public';
do $$
begin
  perform public.set_photo_like('like-policy-private', true);
  raise exception 'private_like_unexpectedly_succeeded';
exception
  when insufficient_privilege then null;
end
$$;
select 'private_rejected=1';
reset role;

update public.photos set visibility = 'private', shared = false where id = 'like-policy-public';
set local role authenticated;
select 'visible_after_private=' || count(*)
from public.user_likes ul
join public.photos p on p.id = ul.photo_id
where p.visibility = 'public';
reset role;
update public.photos set visibility = 'public', shared = true where id = 'like-policy-public';
set local role authenticated;
select 'unlike_count=' || public.set_photo_like('like-policy-public', false);
select 'remaining_like_rows=' || count(*) from public.user_likes where photo_id = 'like-policy-public';
reset role;
select 'anon_execute=' || has_function_privilege('anon', 'public.set_photo_like(text, boolean)', 'EXECUTE')::int;
rollback;
`;

const result = spawnSync(docker, [
  "exec", "-i", databaseContainer,
  "psql", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"
], { encoding: "utf8", input: sql });
if (result.status !== 0) throw new Error("Local like policy query failed");
const evidence = new Set(result.stdout.split(/\r?\n/u).filter((line) => line.includes("=")));
for (const expected of [
  "like_count=1",
  "own_like_rows=1",
  "private_rejected=1",
  "visible_after_private=0",
  "unlike_count=0",
  "remaining_like_rows=0",
  "anon_execute=0"
]) {
  if (!evidence.has(expected)) throw new Error(`Missing local like policy decision: ${expected}`);
}

console.log("[like-policy] Local atomic like, rollback boundary, private filtering, and RPC grants passed.");
