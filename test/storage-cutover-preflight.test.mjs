import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const script = readFileSync('scripts/check-storage-cutover-readiness.sh', 'utf8');
const snapshot = JSON.parse(
  readFileSync('docs/qa/storage-cutover-readiness-2026-07-27.json', 'utf8')
);
const cutoverQa = readFileSync(
  'docs/qa/private-storage-cutover-2026-07-28.md',
  'utf8'
);
const launchChecklist = readFileSync(
  'docs/product/public-beta-launch-checklist-2026-07-22.md',
  'utf8'
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

test('private Storage snapshot records the completed cutover with aggregate evidence only', () => {
  assert.equal(snapshot.project_ref, 'pqczcponriukilrtpbdl');
  assert.equal(snapshot.phase, 'post_cutover');
  assert.equal(snapshot.photos_bucket_public, false);
  assert.equal(snapshot.missing_storage_path_rows, 0);
  assert.ok(snapshot.storage_policy_count >= 3);
  assert.equal(snapshot.auth_user_count, 2);
  assert.deepEqual(snapshot.security_warnings, [
    'auth_leaked_password_protection'
  ]);
  assert.equal(snapshot.contains_user_data, false);
});

test('private Storage cutover evidence and launch gates stay recorded', () => {
  assert.match(cutoverQa, /Bucket privacy:\s*private/i);
  assert.match(cutoverQa, /Anonymous public signed URL:\s*HTTP 200/i);
  assert.match(cutoverQa, /Anonymous private signed URL:\s*HTTP 400/i);
  assert.match(cutoverQa, /Other authenticated user[\s\S]*private rows:\s*0/i);
  assert.match(cutoverQa, /Logged-out Production Explore[\s\S]*public photos visible/i);
  assert.match(launchChecklist, /\*\*P0 상태:\*\* 활성 기술 관문은 모두 완료/);
  assert.match(launchChecklist, /- \[x\] 로그아웃 사용자와 소유자가 아닌 계정의 비공개 파일 접근은 실패/);
  assert.match(launchChecklist, /- \[x\] 소유자·다른 로그인 사용자·로그아웃 사용자의 3계정 RLS·Storage QA/);
});
