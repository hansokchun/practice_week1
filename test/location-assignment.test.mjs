import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    getLocationAssignmentPhoto,
    getMissingLocationAssignmentPhotos,
    getNearbyLocatedPhotos,
    getUploadCompletionPhotos
} from '../js/location-assignment.mjs';

const photos = [
    { id: 'before-2', owner_id: 'me', date: '2026-08-10T08:00:00Z', lat: 37.1, lng: 127.1 },
    { id: 'before-1', owner_id: 'me', date: '2026-08-10T09:00:00Z', lat: 37.2, lng: 127.2 },
    { id: 'selected', owner_id: 'me', date: '2026-08-10T10:00:00Z', lat: null, lng: null },
    { id: 'after-1', owner_id: 'me', date: '2026-08-10T11:00:00Z', lat: 37.3, lng: 127.3 },
    { id: 'after-2', owner_id: 'me', date: '2026-08-10T12:00:00Z', lat: 37.4, lng: 127.4 },
    { id: 'after-3', owner_id: 'me', date: '2026-08-10T13:00:00Z', lat: 37.5, lng: 127.5 },
    { id: 'other-owner', owner_id: 'other', date: '2026-08-10T10:30:00Z', lat: null, lng: null }
];

test('location assignment queue contains only the current owners missing-location photos', () => {
    assert.deepEqual(getMissingLocationAssignmentPhotos(photos, 'me').map((photo) => photo.id), ['selected']);
    assert.equal(getLocationAssignmentPhoto(photos, 'missing-id', 'me')?.id, 'selected');
});

test('nearby references contain only the closest photo on each side within one day', () => {
    assert.deepEqual(
        getNearbyLocatedPhotos(photos, photos[2]).map((photo) => [photo.id, photo.relativeDirection]),
        [
            ['before-1', 'before'],
            ['after-1', 'after']
        ]
    );
});

test('nearby references exclude located photos more than one day away', () => {
    const selected = { id: 'selected', date: '2026-08-10T10:00:00Z' };
    const distant = [
        { id: 'too-early', date: '2026-08-09T09:59:59Z', lat: 37, lng: 127 },
        { id: 'too-late', date: '2026-08-11T10:00:01Z', lat: 35, lng: 129 }
    ];

    assert.deepEqual(getNearbyLocatedPhotos(distant, selected), []);
});

test('nearby references are empty when the selected photo has no usable capture time', () => {
    assert.deepEqual(getNearbyLocatedPhotos(photos, { id: 'undated', date: null }), []);
});

test('upload completion photos preserve the saved id order from the library', () => {
    assert.deepEqual(getUploadCompletionPhotos(photos, ['selected', 'after-1']).map((photo) => photo.id), ['selected', 'after-1']);
});
