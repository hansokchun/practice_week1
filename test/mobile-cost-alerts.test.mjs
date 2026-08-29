import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const policy = readFileSync('docs/mobile/cost-alerts.md', 'utf8');

test('mobile cost policy covers every launch cost surface', () => {
  for (const metric of ['API 요청', 'Maps SDK', 'Storage 용량', '이미지 egress', 'Edge Function', 'MAU']) {
    assert.match(policy, new RegExp(metric));
  }
  assert.match(policy, /70%/);
  assert.match(policy, /90%/);
  assert.match(policy, /2배/);
});

test('cost alerts define safe actions without exposing user-level telemetry', () => {
  assert.match(policy, /집계값/);
  assert.match(policy, /이메일.*사용자 ID.*좌표.*사진 URL/s);
  assert.match(policy, /업로드.*제한/);
  assert.match(policy, /지도.*할당량/);
  assert.match(policy, /공개 사진.*비공개.*바꾸지/s);
});

test('cost policy separates repository definition from external dashboard activation', () => {
  assert.match(policy, /외부 설정/);
  assert.match(policy, /Supabase.*Google Cloud/s);
  assert.match(policy, /담당자.*지원 채널/);
  assert.match(policy, /출시 전.*활성화/);
});

test('cost policy avoids stale absolute pricing claims and cites official billing sources', () => {
  assert.doesNotMatch(policy, /(?:Free|Pro).*\d+\s*(?:GB|회|달러)/i);
  assert.match(policy, /https:\/\/supabase\.com\/docs\/guides\/platform\/billing-on-supabase/);
  assert.match(policy, /https:\/\/developers\.google\.com\/maps\/billing-and-pricing/);
});
