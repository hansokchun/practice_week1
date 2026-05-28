import test from 'node:test';
import assert from 'node:assert/strict';

import { getPublicTripRouteMeta } from '../js/public-trip-meta.mjs';

test('getPublicTripRouteMeta includes date range, places, and public photo count', () => {
    assert.equal(getPublicTripRouteMeta({
        dateRange: '2026.05.01 - 2026.05.02',
        places: 2,
        photoCount: 3
    }), '2026.05.01 - 2026.05.02 · 2 places · 3 public photos');
});

test('getPublicTripRouteMeta handles empty counts', () => {
    assert.equal(getPublicTripRouteMeta({
        dateRange: '날짜 미정',
        places: 0,
        photoCount: 0
    }), '날짜 미정 · 0 places · 0 public photos');
});
