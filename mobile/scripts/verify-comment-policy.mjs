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

const authorId = "55555555-5555-4555-8555-555555555555";
const otherId = "66666666-6666-4666-8666-666666666666";
const sql = `
begin;
insert into auth.users(id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('${authorId}', 'authenticated', 'authenticated', 'comment-author@example.invalid', '{}', '{}', now(), now()),
  ('${otherId}', 'authenticated', 'authenticated', 'comment-other@example.invalid', '{}', '{}', now(), now());
insert into public.photos(id, owner_id, visibility, shared, storage_path)
values ('comment-policy-public', '${otherId}', 'public', true, '${otherId}/public.jpg');

select set_config('request.jwt.claim.sub', '${authorId}', true);
set local role authenticated;
insert into public.comments(photo_id, author_id, text) values
  ('comment-policy-public', '${authorId}', '  first comment  '),
  ('comment-policy-public', '${authorId}', 'second comment'),
  ('comment-policy-public', '${authorId}', 'third comment'),
  ('comment-policy-public', '${authorId}', 'fourth comment'),
  ('comment-policy-public', '${authorId}', 'fifth comment');
select 'trimmed_text=' || text from public.comments where photo_id = 'comment-policy-public' order by id limit 1;
do $$
begin
  insert into public.comments(photo_id, author_id, text, date)
  values ('comment-policy-public', '${authorId}', 'sixth comment', '2000-01-01T00:00:00Z');
  raise exception 'rate_limit_unexpectedly_succeeded';
exception
  when program_limit_exceeded then null;
end
$$;
select 'rate_limit_rejected=1';
reset role;

select set_config('request.jwt.claim.sub', '${otherId}', true);
set local role authenticated;
with deleted as (
  delete from public.comments where photo_id = 'comment-policy-public' returning id
)
select 'other_delete_count=' || count(*) from deleted;
reset role;

select set_config('request.jwt.claim.sub', '${authorId}', true);
set local role authenticated;
with deleted as (
  delete from public.comments where photo_id = 'comment-policy-public' and text = 'fifth comment' returning id
)
select 'own_delete_count=' || count(*) from deleted;
reset role;

update public.photos set visibility = 'private', shared = false where id = 'comment-policy-public';
select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select 'anon_private_count=' || count(*) from public.comments where photo_id = 'comment-policy-public';
reset role;
select 'direct_execute=' || has_function_privilege('authenticated', 'public.enforce_comment_submission_limits()', 'EXECUTE')::int;
rollback;
`;

const result = spawnSync(docker, [
  "exec", "-i", databaseContainer,
  "psql", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"
], { encoding: "utf8", input: sql });
if (result.status !== 0) throw new Error("Local comment policy query failed");
const evidence = new Set(result.stdout.split(/\r?\n/u).filter((line) => line.includes("=")));
for (const expected of [
  "trimmed_text=first comment",
  "rate_limit_rejected=1",
  "other_delete_count=0",
  "own_delete_count=1",
  "anon_private_count=0",
  "direct_execute=0"
]) {
  if (!evidence.has(expected)) throw new Error(`Missing local comment policy decision: ${expected}`);
}

console.log("[comment-policy] Local trim, rate limit, ownership delete, private filtering, and function grants passed.");
