import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getLocationEditorPhoto,
    getMissingLocationPhotos,
    normalizeLocationDraft
} from '../js/location-workflow.mjs';

const photos = [
    { id: 'a', name: 'Jeju cafe', lat: null, lng: null },
    { id: 'b', name: 'Seongsan', lat: 33.4507, lng: 126.5707 },
    { id: 'c', name: 'Night walk', lat: null, lng: 127.0321 },
    { id: 'd', name: 'Forest road', lat: 37.55, lng: null },
    { id: 'e', name: 'Zero island', lat: 0, lng: 0 }
];

test('getMissingLocationPhotos returns photos missing either coordinate', () => {
    assert.deepEqual(getMissingLocationPhotos(photos).map((photo) => photo.id), ['a', 'c', 'd', 'e']);
});

test('getLocationEditorPhoto prefers the selected missing-location photo', () => {
    assert.equal(getLocationEditorPhoto(photos, 'd')?.id, 'd');
});

test('getLocationEditorPhoto falls back to first missing photo before located photos', () => {
    assert.equal(getLocationEditorPhoto(photos, 'unknown')?.id, 'a');
    assert.equal(getLocationEditorPhoto([{ id: 'z', lat: 1, lng: 2 }], null)?.id, 'z');
});

test('normalizeLocationDraft keeps valid coordinates and defaults missing values', () => {
    assert.deepEqual(normalizeLocationDraft({ lat: 33.3, lng: null }), { lat: '37.579617', lng: '126.977041' });
    assert.deepEqual(normalizeLocationDraft({ lat: 0, lng: 0 }), { lat: '37.579617', lng: '126.977041' });
    assert.deepEqual(normalizeLocationDraft(null), { lat: '37.579617', lng: '126.977041' });
});
