import test from 'node:test';
import assert from 'node:assert/strict';

import { getTravelSummary } from '../js/travel-summary.mjs';

const photos = [
    { id: 'p1', lat: 33, lng: 126, date: '2026-05-01T10:00:00Z' },
    { id: 'p2', lat: 35, lng: 128, date: '2026-05-02T10:00:00Z' },
    { id: 'p3', lat: null, lng: null, date: '2026-05-02T12:00:00Z' }
];

test('getTravelSummary uses the latest album draft title and photo metadata', () => {
    assert.deepEqual(getTravelSummary({
        draftPhotos: photos,
        albumDrafts: [{ name: '부산 주말' }]
    }), {
        title: '부산 주말',
        photoCount: 3,
        places: 2,
        days: 2,
        publicCount: 1
    });
});

test('getTravelSummary prefers the selected album when present', () => {
    assert.deepEqual(getTravelSummary({
        draftPhotos: photos,
        albumDrafts: [{ name: '부산 주말' }],
        selectedAlbum: { title: '공개 제주 여행', photo_count: 42, places: 11 }
    }), {
        title: '공개 제주 여행',
        photoCount: 42,
        places: 11,
        days: 2,
        publicCount: 40
    });
});

test('getTravelSummary handles an empty draft without demo counts', () => {
    assert.deepEqual(getTravelSummary({ draftPhotos: [], albumDrafts: [] }), {
        title: '나의 여행 앨범',
        photoCount: 0,
        places: 0,
        days: 0,
        publicCount: 0
    });
});
