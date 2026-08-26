import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const policy = readFileSync('docs/operations/usage-cost-thresholds.md', 'utf8');
const report = readFileSync('scripts/report-usage-thresholds.sql', 'utf8');
const checklist = readFileSync('docs/product/public-beta-launch-checklist-2026-07-22.md', 'utf8');

test('usage policy defines warning and action thresholds without storing personal data', () => {
    assert.match(policy, /70%/);
    assert.match(policy, /90%/);
    assert.match(policy, /Supabase Storage \| 1 GB \| 100 GB/i);
    assert.match(policy, /이메일.*좌표.*파일 경로/);
});

test('aggregate report measures storage and product counts only', () => {
    assert.match(report, /storage_bytes/);
    assert.match(report, /storage_gib/);
    assert.match(report, /auth\.users/);
    assert.match(report, /storage\.objects/);
    assert.doesNotMatch(report, /select\s+\*/i);
});

test('launch checklist records usage threshold operations as ready', () => {
    assert.match(checklist, /- \[x\] Storage, 이미지 트래픽, 활성 사용자, 서비스 비용 기준을 추적한다\./);
});
