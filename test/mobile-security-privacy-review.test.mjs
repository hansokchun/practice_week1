import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const packageJson = JSON.parse(readFileSync('mobile/package.json', 'utf8'));
const workflow = readFileSync('.github/workflows/mobile-ci.yml', 'utf8');

test('mobile security and privacy audit is a required local and CI release gate', () => {
  assert.equal(packageJson.scripts['security:verify'], 'node ./scripts/audit-security-privacy.mjs');
  assert.match(workflow, /npm run privacy:verify[\s\S]*npm run security:verify/u);

  const audit = readFileSync('mobile/scripts/audit-security-privacy.mjs', 'utf8');
  for (const boundary of [
    'auth-callback.ts', 'supabase-client.ts', 'native-local-photo-storage.ts',
    'publication-link-token.ts', 'audit-release-artifacts.mjs',
    '20260810092619_synchronize_photo_likes.sql',
    '20260825085451_restore_private_photo_storage_policies.sql'
  ]) assert.match(audit, new RegExp(boundary.replaceAll('.', '\\.')));
});

test('security review documents every launch surface and distinguishes local from hosted evidence', () => {
  const review = readFileSync('docs/mobile/security-privacy-review.md', 'utf8');
  for (const heading of [
    '인증 리디렉션', '로컬 데이터', '로그', '공유 링크', 'RLS', 'Storage', '남은 외부 관문'
  ]) assert.match(review, new RegExp(heading));
  assert.match(review, /로컬 Supabase/u);
  assert.match(review, /운영 원격/u);
  assert.match(review, /npm run security:verify/u);
  assert.match(review, /https:\/\/supabase\.com\/docs\/guides\/database\/postgres\/row-level-security/u);
  assert.match(review, /https:\/\/supabase\.com\/docs\/guides\/storage\/security\/access-control/u);
});

test('publication deletion role roundtrip is recorded without stale Docker blocker text', () => {
  const checklist = readFileSync('docs/mobile/prelaunch-checklist.md', 'utf8');
  const deletionLine = checklist.split('\n').find((line) => line.includes('게시 취소, 삭제, 앱 재설치'));
  assert.ok(deletionLine);
  assert.match(deletionLine, /^- \[x\]/u);
  assert.doesNotMatch(deletionLine, /Docker·Podman이 없어/u);
});

test('auth callbacks consume credentials only on the exact app callback and hide provider details', () => {
  const callback = readFileSync('mobile/src/auth-callback.ts', 'utf8');
  const callbackScreen = readFileSync('mobile/app/auth/callback.tsx', 'utf8');
  const oauth = readFileSync('mobile/src/oauth-auth.ts', 'utf8');

  assert.match(callback, /parsedUrl\.protocol !== "ikkyee:"/u);
  assert.match(callback, /parsedUrl\.hostname !== "auth"/u);
  assert.match(callback, /parsedUrl\.pathname !== "\/callback"/u);
  assert.doesNotMatch(callbackScreen, /error instanceof Error \? error\.message/u);
  assert.match(oauth, /url\.protocol !== "https:"/u);
  assert.match(oauth, /loopbackHttp/u);
});

test('local link policy cleanup never removes the persistent photos bucket', () => {
  const verifier = readFileSync('mobile/scripts/verify-mobile-link-policy.mjs', 'utf8');
  assert.doesNotMatch(verifier, /delete from storage\.buckets/iu);
  assert.match(verifier, /delete from storage\.objects/iu);
  assert.match(verifier, /delete from public\.photos/iu);
});

test('photo Storage denial is proven by object survival rather than API error shape', () => {
  const verifier = readFileSync('mobile/scripts/verify-photo-storage-access.mjs', 'utf8');
  assert.doesNotMatch(verifier, /other\.storage\.from\("photos"\)\.remove\(\[privatePath\]\)\)\.error === null/u);
  assert.match(
    verifier,
    /other\.storage\.from\("photos"\)\.remove\(\[privatePath\]\)[\s\S]*requireSignedUrl\(owner, privatePath/u,
  );
});
