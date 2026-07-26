import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync('scripts/backup-supabase.sh', 'utf8');
const schemaPullScript = readFileSync('scripts/pull-supabase-schema.sh', 'utf8');
const schemaBaseline = readFileSync('supabase/schema.sql', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const runbook = readFileSync(
  'docs/operations/public-beta-operations-runbook-2026-07-22.md',
  'utf8'
);

test('Supabase backup commands expose a prerequisite check and encrypted export', () => {
  assert.equal(
    packageJson.scripts['backup:check'],
    'bash scripts/backup-supabase.sh --check'
  );
  assert.equal(
    packageJson.scripts['backup:db'],
    'bash scripts/backup-supabase.sh'
  );
  assert.match(script, /export PATH="\$HOME\/\.local\/bin:\$PATH"/);
});

test('Supabase schema pull creates a secret-free reproducible baseline', () => {
  assert.equal(
    packageJson.scripts['schema:pull'],
    'bash scripts/pull-supabase-schema.sh'
  );
  assert.match(schemaPullScript, /read -r -s -p "Supabase DB URL: "/);
  assert.match(schemaPullScript, /db dump/);
  assert.match(schemaPullScript, /supabase\/schema\.sql/);
  assert.match(schemaPullScript, /postgresql:\/\/|postgres:\/\//);
  assert.match(schemaPullScript, /service_role/);
  assert.match(schemaPullScript, /chmod 644/);
  assert.match(schemaPullScript, /unset SUPABASE_DB_URL/);
});

test('Supabase schema baseline preserves privacy controls without rows or secrets', () => {
  assert.match(schemaBaseline, /^-- Ikkyee live Supabase schema baseline\./);
  assert.match(
    schemaBaseline,
    /CREATE TABLE IF NOT EXISTS "public"\."photos"/
  );
  assert.match(
    schemaBaseline,
    /CREATE TABLE IF NOT EXISTS "public"\."photo_private_locations"/
  );
  assert.match(
    schemaBaseline,
    /CREATE OR REPLACE FUNCTION "public"\."apply_photo_location_privacy"\(\) RETURNS "trigger"/
  );
  assert.match(
    schemaBaseline,
    /CREATE OR REPLACE TRIGGER "photos_apply_location_privacy"/
  );
  assert.match(
    schemaBaseline,
    /ALTER TABLE "public"\."photo_private_locations" ENABLE ROW LEVEL SECURITY;/
  );
  assert.match(
    schemaBaseline,
    /CREATE POLICY "photos_select_owner_or_visible"/
  );
  assert.match(
    schemaBaseline,
    /REVOKE ALL ON FUNCTION "public"\."apply_photo_location_privacy"\(\) FROM PUBLIC;/
  );
  assert.doesNotMatch(schemaBaseline, /^(?:COPY|INSERT INTO)\s/im);
  assert.doesNotMatch(schemaBaseline, /postgres(?:ql)?:\/\//i);
  assert.doesNotMatch(schemaBaseline, /(?:sb_secret_|eyJ[A-Za-z0-9_-]{20,})/);
});

test('Supabase backup keeps raw dumps temporary and encrypts the retained archive', () => {
  assert.match(script, /CLI_VERSION="2\.109\.1"/);
  assert.match(script, /mktemp -d/);
  assert.match(script, /trap cleanup EXIT/);
  assert.match(script, /--role-only/);
  assert.match(script, /--data-only/);
  assert.match(script, /read -r -s -p "Supabase DB URL: "/);
  assert.match(script, /-aes-256-cbc -salt -pbkdf2/);
  assert.match(script, /shasum -a 256/);
  assert.match(script, /backup destination must be outside the Git repository/);
});

test('Backup runbook separates database exports from Storage object recovery', () => {
  assert.match(runbook, /npm run backup:check/);
  assert.match(runbook, /npm run backup:db/);
  assert.match(runbook, /Colima `0\.10\.3`/);
  assert.match(runbook, /First Encrypted Export Record/);
  assert.match(runbook, /checksum `OK`/);
  assert.match(runbook, /owner-only `600` permissions/);
  assert.match(runbook, /Database logical exports include Storage metadata, not the binary objects/);
  assert.match(runbook, /disposable Supabase project/);
});
