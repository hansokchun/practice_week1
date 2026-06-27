import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatRelativeTime } from '../js/relative-time.mjs';

const now = new Date('2026-06-27T12:00:00Z');

test('formatRelativeTime uses broad Korean recency buckets', () => {
    assert.equal(formatRelativeTime('2026-06-27T11:59:30Z', now), '방금');
    assert.equal(formatRelativeTime('2026-06-27T09:00:00Z', now), '3시간 전');
    assert.equal(formatRelativeTime('2026-06-14T12:00:00Z', now), '13일 전');
    assert.equal(formatRelativeTime('2026-06-06T12:00:00Z', now), '3주 전');
    assert.equal(formatRelativeTime('2026-01-27T12:00:00Z', now), '5개월 전');
    assert.equal(formatRelativeTime('2024-06-27T12:00:00Z', now), '2년 전');
});

test('formatRelativeTime treats missing and future values as just now', () => {
    assert.equal(formatRelativeTime('', now), '방금');
    assert.equal(formatRelativeTime('2026-06-27T12:10:00Z', now), '방금');
});
