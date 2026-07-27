import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const script = readFileSync('scripts/check-storage-cutover-readiness.sh', 'utf8');
const snapshot = JSON.parse(
  readFileSync('docs/qa/storage-cutover-readiness-2026-07-27.json', 'utf8')
);

test('private Storage preflight is repeatable and non-destructive', () => {
  assert.equal(
    packageJson.scripts['storage:preflight:check'],
    'bash scripts/check-storage-cutover-readiness.sh --check'
  );
  assert.equal(
    packageJson.scripts['storage:preflight'],
    'bash scripts/check-storage-cutover-readiness.sh'
  );

  assert.match(script, /git status --porcelain/);
  assert.match(script, /origin\/dev/);
  assert.match(script, /origin\/main/);
  assert.match(script, /npm run release:rehearse/);
  assert.match(script, /createSignedUrls/);
  assert.match(script, /storage_path/);
  assert.doesNotMatch(script, /git push|delete from|storage\.buckets.*update/i);
});

test('private Storage preflight snapshot records only aggregate live evidence', () => {
  assert.equal(snapshot.project_ref, 'pqczcponriukilrtpbdl');
  assert.equal(snapshot.photos_bucket_public, true);
  assert.equal(snapshot.missing_storage_path_rows, 0);
  assert.ok(snapshot.storage_policy_count >= 3);
  assert.deepEqual(snapshot.security_warnings, [
    'auth_leaked_password_protection'
  ]);
  assert.equal(snapshot.contains_user_data, false);
});
