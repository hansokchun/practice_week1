import test from 'node:test';
import assert from 'node:assert/strict';

import { formatMissingLocationSummary, getMyphotoStats } from '../js/myphoto-stats.mjs';

test('getMyphotoStats returns zero counts for an empty dashboard', () => {
    assert.deepEqual(getMyphotoStats([], []), {
        photoCount: 0,
        locatedCount: 0,
        missingLocationCount: 0,
        albumCount: 0
    });
});

test('getMyphotoStats counts located photos and saved albums', () => {
    const photos = [
        { id: 'p1', lat: 33, lng: 126, album: 'Jeju' },
        { id: 'p2', lat: null, lng: 126, album: 'Jeju' },
        { id: 'p3', lat: 35, lng: 128, album: 'Busan' }
    ];
    const albums = [{ id: 'a1' }];

    assert.deepEqual(getMyphotoStats(photos, albums), {
        photoCount: 3,
        locatedCount: 2,
        missingLocationCount: 1,
        albumCount: 1
    });
});

test('getMyphotoStats falls back to grouped photo albums when no saved albums exist', () => {
    const photos = [
        { id: 'p1', lat: 33, lng: 126, album: 'Jeju' },
        { id: 'p2', lat: 35, lng: 128, album: 'Jeju' },
        { id: 'p3', lat: 37, lng: 127, album: 'Seoul' }
    ];

    assert.equal(getMyphotoStats(photos, []).albumCount, 2);
});

test('formatMissingLocationSummary reflects the current missing-location count', () => {
    assert.equal(formatMissingLocationSummary(0), '위치 정보가 모두 정리되었습니다.');
    assert.equal(formatMissingLocationSummary(3), '처리 필요: 위치 정보 없는 사진 3장');
});
