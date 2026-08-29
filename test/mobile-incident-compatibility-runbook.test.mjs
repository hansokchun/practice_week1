import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const runbook = readFileSync('docs/mobile/incident-compatibility-runbook.md', 'utf8');
const mobilePackage = JSON.parse(readFileSync('mobile/package.json', 'utf8'));
const appConfig = JSON.parse(readFileSync('mobile/app.json', 'utf8')).expo;

test('runbook states the current binary-only recovery capability without claiming OTA rollback', () => {
  assert.equal(Object.hasOwn(mobilePackage.dependencies, 'expo-updates'), false);
  assert.equal(Object.hasOwn(appConfig, 'updates'), false);
  assert.match(runbook, /현재.*expo-updates.*구성하지 않았다/s);
  assert.match(runbook, /EAS.*channel.*OTA.*아니다/s);
  assert.match(runbook, /스토어.*새 바이너리/s);
  assert.match(runbook, /EAS Update.*도입.*승인/s);
});

test('runbook defines severity, containment, rollback, and closure evidence', () => {
  for (const severity of ['P0', 'P1', 'P2', 'P3']) assert.match(runbook, new RegExp(`\\| ${severity} \\|`));
  for (const surface of ['앱 바이너리', 'RLS·Storage', 'Edge Function', '로컬 SQLite']) {
    assert.match(runbook, new RegExp(surface));
  }
  assert.match(runbook, /개인정보.*로그.*남기지/s);
  assert.match(runbook, /종료 근거/);
});

test('runbook protects local originals and shared backend during rollback', () => {
  assert.match(runbook, /원본 기기 사진.*삭제하지 않는다/s);
  assert.match(runbook, /RLS.*끄지 않는다/s);
  assert.match(runbook, /private.*bucket.*public.*바꾸지 않는다/is);
  assert.match(runbook, /DB.*하향.*마이그레이션.*기본.*금지/s);
  assert.match(runbook, /확장.*이행.*축소/s);
  assert.match(runbook, /N-1/);
});

test('forced upgrades preserve offline local access and are reserved for explicit emergencies', () => {
  assert.match(runbook, /강제 업그레이드.*현재.*구현하지 않았다/s);
  assert.match(runbook, /보안|개인정보/);
  assert.match(runbook, /로컬 사진.*오프라인.*유지/s);
  assert.match(runbook, /최소 지원 버전.*외부 설정/);
});

test('runbook cites current official recovery and compatibility sources', () => {
  assert.match(runbook, /https:\/\/docs\.expo\.dev\/eas-update\/runtime-versions\//);
  assert.match(runbook, /https:\/\/docs\.expo\.dev\/eas-update\/error-recovery\//);
  assert.match(runbook, /https:\/\/supabase\.com\/docs\/guides\/deployment\/database-migrations/);
  assert.match(runbook, /https:\/\/supabase\.com\/docs\/guides\/api\/securing-your-api/);
});
