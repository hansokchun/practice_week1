import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync('scripts/backup-supabase.sh', 'utf8');
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
  assert.match(runbook, /Database logical exports include Storage metadata, not the binary objects/);
  assert.match(runbook, /disposable Supabase project/);
});
