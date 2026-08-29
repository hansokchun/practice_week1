import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    getPublicOwnerProfileMapPhotos,
    getPublicOwnerProfilePhotos
} from '../js/public-owner-profile-photos.mjs';

const photos = [
    { id: 'exact', owner_id: 'ikkyee', visibility: 'public', lat: 37.5, lng: 127, location_precision: 'exact' },
    { id: 'hidden', owner_id: 'ikkyee', visibility: 'public', lat: 35, lng: 129, location_precision: 'hidden' },
    { id: 'missing', owner_id: 'ikkyee', visibility: 'public', lat: null, lng: null, location_precision: 'exact' },
    { id: 'private', owner_id: 'ikkyee', visibility: 'private', lat: 36, lng: 128, location_precision: 'exact' },
    { id: 'other', owner_id: 'other', visibility: 'public', lat: 33, lng: 126, location_precision: 'exact' }
];

test('public profile keeps public photos even when they have no public map pin', () => {
    const profilePhotos = getPublicOwnerProfilePhotos(photos, 'ikkyee');

    assert.deepEqual(profilePhotos.map((photo) => photo.id), ['exact', 'hidden', 'missing']);
});

test('public profile map keeps only photos allowed by the location policy', () => {
    const profilePhotos = getPublicOwnerProfilePhotos(photos, 'ikkyee');
    const mapPhotos = getPublicOwnerProfileMapPhotos(profilePhotos);

    assert.deepEqual(mapPhotos.map((photo) => photo.id), ['exact']);
});
