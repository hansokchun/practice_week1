import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    getOwnerProfileMapPhotos,
    getPublicOwnerProfileMapPhotos,
    getPublicOwnerProfilePhotos
} from '../js/public-owner-profile-photos.mjs';

const photos = [
    { id: 'exact', owner_id: 'ikkyee', visibility: 'public', lat: 37.5, lng: 127, location_precision: 'exact' },
    { id: 'hidden', owner_id: 'ikkyee', visibility: 'public', lat: 35, lng: 129, location_precision: 'hidden' },
    { id: 'missing', owner_id: 'ikkyee', visibility: 'public', lat: null, lng: null, location_precision: 'exact' },
    { id: 'private', owner_id: 'ikkyee', visibility: 'private', lat: 36, lng: 128, location_precision: 'exact' },
    { id: 'link-only', owner_id: 'ikkyee', visibility: 'link', lat: 37, lng: 127.5, location_precision: 'exact' },
    { id: 'other', owner_id: 'other', visibility: 'public', lat: 33, lng: 126, location_precision: 'exact' }
];

test('public profile keeps public photos even when they have no public map pin', () => {
    const profilePhotos = getPublicOwnerProfilePhotos(photos, 'ikkyee');

    assert.deepEqual(profilePhotos.map((photo) => photo.id), ['exact', 'hidden', 'missing']);
});

test('public profile map keeps every public photo with coordinates', () => {
    const profilePhotos = getPublicOwnerProfilePhotos(photos, 'ikkyee');
    const mapPhotos = getPublicOwnerProfileMapPhotos(profilePhotos);

    assert.deepEqual(mapPhotos.map((photo) => photo.id), ['exact', 'hidden']);
});

test('own profile map includes every owned located photo regardless of visibility', () => {
    const mapPhotos = getOwnerProfileMapPhotos(photos, 'ikkyee', 'ikkyee');

    assert.deepEqual(mapPhotos.map((photo) => photo.id), ['exact', 'hidden', 'private', 'link-only']);
});

test('another viewer profile map uses every public saved coordinate', () => {
    const mapPhotos = getOwnerProfileMapPhotos(photos, 'ikkyee', 'viewer');

    assert.deepEqual(mapPhotos.map((photo) => photo.id), ['exact', 'hidden']);
});
