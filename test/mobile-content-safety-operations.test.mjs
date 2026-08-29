import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const runbook = readFileSync(new URL('../docs/mobile/content-safety-operations.md', import.meta.url), 'utf8');

test('content safety runbook defines triage ownership and response windows', () => {
  assert.match(runbook, /신고 운영 책임자/);
  assert.match(runbook, /1시간 이내/);
  assert.match(runbook, /24시간 이내/);
  assert.match(runbook, /72시간 이내/);
  assert.match(runbook, /pending.*reviewing.*actioned.*dismissed/s);
});

test('content safety runbook protects reporter data and requires an auditable decision', () => {
  assert.match(runbook, /신고자.*대상 사용자.*공개하지 않는다/);
  assert.match(runbook, /reviewed_at/);
  assert.match(runbook, /증거 보존/);
  assert.match(runbook, /이의 제기/);
  assert.match(runbook, /롤백/);
  assert.doesNotMatch(runbook, /sb_secret_|service_role\s*=|SUPABASE_SERVICE_ROLE_KEY\s*=/i);
});
