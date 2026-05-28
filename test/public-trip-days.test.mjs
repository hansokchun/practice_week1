import test from 'node:test';
import assert from 'node:assert/strict';

import { getPublicTripDayCards } from '../js/public-trip-days.mjs';

test('getPublicTripDayCards summarizes public trip photos by travel day', () => {
    const cards = getPublicTripDayCards([
        { id: 'p1', date: '2026-05-01T10:00:00Z', lat: 33, lng: 126 },
        { id: 'p2', date: '2026-05-01T12:00:00Z', lat: null, lng: null },
        { id: 'p3', date: '2026-05-02T10:00:00Z', lat: 35, lng: 128 }
    ]);

    assert.deepEqual(cards, [
        {
            eyebrow: 'Day 1',
            title: '2026.05.01',
            body: '2장의 공개 사진과 1개의 위치가 담긴 구간입니다.'
        },
        {
            eyebrow: 'Day 2',
            title: '2026.05.02',
            body: '1장의 공개 사진과 1개의 위치가 담긴 구간입니다.'
        }
    ]);
});

test('getPublicTripDayCards returns a draft fallback when no dated photos exist', () => {
    assert.deepEqual(getPublicTripDayCards([], '제주 여행'), [
        {
            eyebrow: 'Draft',
            title: '제주 여행',
            body: '공개할 날짜 정보가 있는 사진을 추가하면 하루별 여정이 표시됩니다.'
        }
    ]);
});
