import test from 'node:test';
import assert from 'node:assert/strict';

import { getTravelDaySummaries } from '../js/travel-days.mjs';

test('getTravelDaySummaries groups photos by capture day', () => {
    const summaries = getTravelDaySummaries([
        { id: 'p1', date: '2026-05-01T10:00:00Z', lat: 33, lng: 126 },
        { id: 'p2', date: '2026-05-01T12:00:00Z', lat: null, lng: null },
        { id: 'p3', date: '2026-05-02T10:00:00Z', lat: 35, lng: 128 }
    ]);

    assert.deepEqual(summaries, [
        { dayLabel: 'Day 1', title: '2026.05.01', photoCount: 2, places: 1 },
        { dayLabel: 'Day 2', title: '2026.05.02', photoCount: 1, places: 1 }
    ]);
});

test('getTravelDaySummaries returns an empty list without dated photos', () => {
    assert.deepEqual(getTravelDaySummaries([{ id: 'p1' }]), []);
});
