import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getLocationEditorCoordinateUpdate,
    hasCompleteLocation,
    getLocationEditorPhoto,
    getMissingLocationPhotos,
    normalizeLocationDraft
} from '../js/location-workflow.mjs';

const photos = [
    { id: 'a', name: 'Jeju cafe', lat: null, lng: null },
    { id: 'b', name: 'Seongsan', lat: 33.4507, lng: 126.5707 },
    { id: 'c', name: 'Night walk', lat: null, lng: 127.0321 },
    { id: 'd', name: 'Forest road', lat: 37.55, lng: null },
    { id: 'e', name: 'Zero island', lat: 0, lng: 0 },
    { id: 'f', name: 'Unknown place', lat: null, lng: null, location_assignment_skipped: true }
];

test('getMissingLocationPhotos returns photos missing either coordinate', () => {
    assert.deepEqual(getMissingLocationPhotos(photos).map((photo) => photo.id), ['a', 'c', 'd', 'e']);
});

test('Gyeongbokgung editor defaults do not turn a missing location into saved coordinates', () => {
    const photo = { id: 'missing', lat: null, lng: null };
    const draft = normalizeLocationDraft(photo);

    assert.deepEqual(draft, { lat: '37.579617', lng: '126.977041' });
    assert.equal(hasCompleteLocation(photo), false);
    assert.deepEqual(photo, { id: 'missing', lat: null, lng: null });
    assert.deepEqual(getLocationEditorCoordinateUpdate(photo, draft), {});
    assert.deepEqual(getLocationEditorCoordinateUpdate(photo, draft, { hasPickedLocation: true }), {
        lat: 37.579617,
        lng: 126.977041,
        geo_source: 'manual',
        location_assignment_skipped: false
    });
});

test('existing coordinates are only rewritten after the user picks a new position', () => {
    assert.deepEqual(getLocationEditorCoordinateUpdate(
        { id: 'located', lat: 33.45, lng: 126.57 },
        { lat: '33.460000', lng: '126.580000' }
    ), {});
    assert.deepEqual(getLocationEditorCoordinateUpdate(
        { id: 'located', lat: 33.45, lng: 126.57 },
        { lat: '33.460000', lng: '126.580000' },
        { hasPickedLocation: true }
    ), {
        lat: 33.46,
        lng: 126.58,
        geo_source: 'manual',
        location_assignment_skipped: false
    });
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
