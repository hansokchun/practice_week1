import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const migrationsDirectory = new URL('../supabase/migrations/', import.meta.url);

function safetyMigration() {
  const name = readdirSync(migrationsDirectory)
    .find((candidate) => candidate.endsWith('_add_mobile_content_safety.sql'));
  assert.ok(name, 'mobile content safety migration is required');
  return readFileSync(new URL(name, migrationsDirectory), 'utf8');
}

test('content safety tables expose only the minimum authenticated operations', () => {
  const sql = safetyMigration();
  assert.match(sql, /create table public\.user_blocks/i);
  assert.match(sql, /create table public\.content_reports/i);
  assert.match(sql, /alter table public\.user_blocks enable row level security/i);
  assert.match(sql, /alter table public\.content_reports enable row level security/i);
  assert.match(sql, /revoke all on table public\.user_blocks from anon, authenticated/i);
  assert.match(sql, /grant select, insert, delete on table public\.user_blocks to authenticated/i);
  assert.match(sql, /revoke all on table public\.content_reports from anon, authenticated/i);
  assert.match(sql, /grant select, insert on table public\.content_reports to authenticated/i);
  assert.doesNotMatch(sql, /grant[^;]*(?:update|delete)[^;]*content_reports[^;]/i);
});

test('content safety policies bind every client row to the authenticated reporter or blocker', () => {
  const sql = safetyMigration();
  assert.match(sql, /user_blocks_select_own[\s\S]*for select[\s\S]*to authenticated[\s\S]*blocker_id[\s\S]*auth\.uid/i);
  assert.match(sql, /user_blocks_insert_own[\s\S]*for insert[\s\S]*to authenticated[\s\S]*blocker_id[\s\S]*auth\.uid/i);
  assert.match(sql, /user_blocks_delete_own[\s\S]*for delete[\s\S]*to authenticated[\s\S]*blocker_id[\s\S]*auth\.uid/i);
  assert.match(sql, /content_reports_select_own[\s\S]*for select[\s\S]*to authenticated[\s\S]*reporter_id[\s\S]*auth\.uid/i);
  assert.match(sql, /content_reports_insert_own[\s\S]*for insert[\s\S]*to authenticated[\s\S]*reporter_id[\s\S]*auth\.uid/i);
  assert.match(sql, /reporter_id <> reported_user_id/i);
  assert.match(sql, /blocker_id <> blocked_id/i);
});

test('reports are normalized, deduplicated, server-timed, and rate limited', () => {
  const sql = safetyMigration();
  assert.match(sql, /security invoker/i);
  assert.match(sql, /set search_path = public, pg_temp/i);
  assert.match(sql, /new\.created_at\s*:=\s*now\(\)/i);
  assert.match(sql, /interval '24 hours'/i);
  assert.match(sql, />= 10/i);
  assert.match(sql, /content_reports_pending_photo_unique/i);
  assert.match(sql, /content_reports_pending_profile_unique/i);
  assert.match(sql, /revoke all on function public\.enforce_content_report_submission\(\) from public, anon, authenticated/i);
  assert.doesNotMatch(sql, /service[_-]?role|sb_secret_/i);
});

test('blocked authors are excluded from authenticated public profile, photo, and comment reads', () => {
  const sql = safetyMigration();
  assert.match(sql, /drop policy if exists "Profiles are viewable by everyone"/i);
  assert.match(sql, /profiles_select_authenticated_unblocked[\s\S]*not exists[\s\S]*user_blocks/i);
  assert.match(sql, /photos_select_owner_or_visible[\s\S]*not exists[\s\S]*user_blocks/i);
  assert.match(sql, /comments_select_visible_photo[\s\S]*not exists[\s\S]*user_blocks/i);
});
