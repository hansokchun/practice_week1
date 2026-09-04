import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    PHOTO_DETAIL_MAP_ZOOM,
    getPhotoDetailMapViewport,
    getPhotoDetailOwnerMapItems
} from '../js/photo-detail-map.mjs';

const selected = {
    id: 'selected',
    owner_id: 'author',
    lat: 37.5796,
    lng: 126.977,
    visibility: 'public',
    location_precision: 'exact'
};

test('photo detail viewport keeps the selected photo centered at the existing zoom', () => {
    assert.equal(PHOTO_DETAIL_MAP_ZOOM, 14);
    assert.deepEqual(getPhotoDetailMapViewport(selected), {
        center: { lat: 37.5796, lng: 126.977 },
        zoom: 14
    });
});

test('photo detail map includes all located photos for the owner viewing their own photo', () => {
    const items = getPhotoDetailOwnerMapItems(selected, [
        { id: 'private', owner_id: 'author', lat: 35.1, lng: 129.1, visibility: 'private', location_precision: 'hidden' },
        { id: 'other-author', owner_id: 'other', lat: 36, lng: 128, visibility: 'public', location_precision: 'exact' }
    ], 'author');

    assert.deepEqual(items.map((photo) => photo.id), ['selected', 'private']);
    assert.equal(items[0].isSelected, true);
    assert.equal(items[1].isSelected, false);
});

test('photo detail map exposes only public map-eligible photos to another viewer', () => {
    const items = getPhotoDetailOwnerMapItems(selected, [
        { id: 'public', owner_id: 'author', lat: 35, lng: 129, visibility: 'public', location_precision: 'approximate' },
        { id: 'link', owner_id: 'author', lat: 36, lng: 128, visibility: 'link', location_precision: 'exact' },
        { id: 'private', owner_id: 'author', lat: 34, lng: 127, visibility: 'private', location_precision: 'exact' },
        { id: 'hidden', owner_id: 'author', lat: 33, lng: 126, visibility: 'public', location_precision: 'hidden' },
        { id: 'missing', owner_id: 'author', lat: null, lng: null, visibility: 'public', location_precision: 'exact' }
    ], 'viewer');

    assert.deepEqual(items.map((photo) => photo.id), ['selected', 'public', 'link', 'hidden']);
});
