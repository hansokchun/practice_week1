import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const migrationDirectory = new URL('../supabase/migrations/', import.meta.url);

test('Supabase migrations begin with a complete secret-free schema baseline', () => {
  const migrations = readdirSync(migrationDirectory)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  assert.match(migrations[0] ?? '', /^\d{14}_initial_remote_schema_baseline\.sql$/);
  const baseline = readFileSync(new URL(migrations[0], migrationDirectory), 'utf8');

  for (const table of ['profiles', 'photos', 'photo_private_locations', 'comments', 'user_likes']) {
    assert.match(baseline, new RegExp(`CREATE TABLE IF NOT EXISTS "public"\\."${table}"`));
  }
  assert.match(baseline, /ALTER TABLE "public"\."photos" ENABLE ROW LEVEL SECURITY/);
  assert.match(baseline, /CREATE POLICY "photos_insert_owner"/);
  assert.match(baseline, /CREATE OR REPLACE TRIGGER "photos_apply_location_privacy"/);
  assert.doesNotMatch(baseline, /\b(?:sb_secret_|service_role_key|SUPABASE_DB_PASSWORD)\b/i);
  assert.doesNotMatch(baseline, /^\s*COPY\s+"public"\./mi);
  assert.doesNotMatch(baseline, /--\s*Data for Name:/i);
});

test('the baseline is ordered before every incremental migration', () => {
  const migrations = readdirSync(migrationDirectory)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  assert.equal(migrations[0]?.includes('initial_remote_schema_baseline'), true);
  assert.equal(migrations.slice(1).some((name) => name.includes('defer_photo_private_location_fk')), true);
});
