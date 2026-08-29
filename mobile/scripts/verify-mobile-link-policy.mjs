import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const docker = process.env["DOCKER_BIN"] ?? (
  existsSync("/Applications/Docker.app/Contents/Resources/bin/docker")
    ? "/Applications/Docker.app/Contents/Resources/bin/docker"
    : "docker"
);
const containerList = spawnSync(docker, ["ps", "--format", "{{.Names}}"], { encoding: "utf8" });
if (containerList.status !== 0) throw new Error("Local Docker engine is required");
const databaseContainer = containerList.stdout.split(/\r?\n/u)
  .find((name) => name.startsWith("supabase_db_"));
if (databaseContainer === undefined) throw new Error("Local Supabase database is not running");

const ownerId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const tokenHash = "a".repeat(64);
const sql = `
begin;
set local session_replication_role = replica;
insert into public.photos(id, owner_id, visibility, shared, storage_path)
values ('policy-public', '${ownerId}', 'public', true, '${ownerId}/public.jpg');
insert into public.photos(
  id, owner_id, visibility, shared, storage_path, link_token_hash, link_token_created_at
) values (
  'policy-mobile-link', '${ownerId}', 'private', false, '${ownerId}/link.jpg', '${tokenHash}', now()
);
set local session_replication_role = origin;
set local row_security = on;
set local role anon;
select 'anon_public=' || count(*) from public.photos where id = 'policy-public';
select 'anon_mobile_link=' || count(*) from public.photos where id = 'policy-mobile-link';
reset role;
select set_config('request.jwt.claim.sub', '${otherId}', true);
set local role authenticated;
select 'non_owner_mobile_link=' || count(*) from public.photos where id = 'policy-mobile-link';
reset role;
select set_config('request.jwt.claim.sub', '${ownerId}', true);
set local role authenticated;
select 'owner_mobile_link=' || count(*) from public.photos where id = 'policy-mobile-link';
reset role;
select 'token_index=' || count(*) from pg_indexes
where schemaname = 'public' and indexname = 'photos_link_token_hash_unique_idx';
rollback;
`;
const query = spawnSync(docker, [
  "exec", "-i", databaseContainer,
  "psql", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"
], { encoding: "utf8", input: sql });
if (query.status !== 0) throw new Error("Local mobile link policy query failed");

const evidence = new Set(query.stdout.split(/\r?\n/u).filter((line) => line.includes("=")));
for (const expected of [
  "anon_public=1",
  "anon_mobile_link=0",
  "non_owner_mobile_link=0",
  "owner_mobile_link=1",
  "token_index=1"
]) {
  if (!evidence.has(expected)) throw new Error(`Missing local policy decision: ${expected}`);
}

const endpoint = new URL(
  "/functions/v1/photo-link",
  process.env["SUPABASE_LOCAL_URL"] ?? "http://127.0.0.1:54321"
);
const invalidResponse = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token: "invalid" })
});
if (invalidResponse.status !== 404 || invalidResponse.headers.get("cache-control") !== "no-store") {
  throw new Error("Local photo-link function did not reject an invalid token safely");
}

const validToken = "1".repeat(64);
const validTokenHash = createHash("sha256").update(validToken).digest("hex");
const fixturePath = `${ownerId}/policy-link.jpg`;
const fixtureSql = `
insert into storage.buckets(id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;
set session_replication_role = replica;
insert into public.photos(
  id, owner_id, visibility, shared, storage_path, link_token_hash, link_token_created_at,
  date, description, lat, lng
) values (
  'policy-valid-mobile-link', '${ownerId}', 'private', false, '${fixturePath}',
  '${validTokenHash}', now(), '2026-08-24', 'local-policy-fixture', 37.5, 127.0
);
set session_replication_role = origin;
insert into storage.objects(bucket_id, name, metadata)
values ('photos', '${fixturePath}', '{"mimetype":"image/jpeg","size":4}'::jsonb)
on conflict (bucket_id, name) do nothing;
`;
const cleanupSql = `
set session_replication_role = replica;
delete from storage.objects where bucket_id = 'photos' and name = '${fixturePath}';
delete from public.photos where id = 'policy-valid-mobile-link';
set session_replication_role = origin;
`;
function runFixtureSql(input) {
  return spawnSync(docker, [
    "exec", "-i", databaseContainer,
    "psql", "-qAt", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"
  ], { encoding: "utf8", input });
}

const fixture = runFixtureSql(fixtureSql);
if (fixture.status !== 0) throw new Error("Could not create local link function fixture");
try {
  const validResponse = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: validToken })
  });
  const validBody = await validResponse.json();
  const serializedBody = JSON.stringify(validBody);
  if (validResponse.status !== 200 || validResponse.headers.get("cache-control") !== "no-store" ||
    typeof validBody?.photo?.imageUrl !== "string" || !validBody.photo.imageUrl.includes("/storage/v1/object/sign/photos/") ||
    serializedBody.includes(validToken) || serializedBody.includes(validTokenHash) ||
    serializedBody.includes("37.5") || serializedBody.includes("127")) {
    throw new Error("Local photo-link function did not return a safe signed-photo projection");
  }
  const revoked = runFixtureSql(`
    update public.photos
    set link_token_hash = null, link_token_created_at = null
    where id = 'policy-valid-mobile-link';
  `);
  if (revoked.status !== 0) throw new Error("Could not revoke local link function fixture");
  const revokedResponse = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: validToken })
  });
  if (revokedResponse.status !== 404 || revokedResponse.headers.get("cache-control") !== "no-store") {
    throw new Error("Local photo-link function did not hide a revoked link");
  }
} finally {
  const cleanup = runFixtureSql(cleanupSql);
  if (cleanup.status !== 0) throw new Error("Could not remove local link function fixture");
}

console.log("[link-policy] Local roles, token index, invalid/revoked-token rejection, and valid signed-link checks passed.");
