import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getPublicSurfaceAlbums } from '../js/public-surface-albums.mjs';

const realAlbums = [
    { id: 'real-public', title: 'Real public album', photos: [{ id: 'real-photo', lat: 37.5, lng: 127 }] }
];

const sampleAlbums = [
    { id: 'sample-public-photos', title: 'Public photo samples', photos: [{ id: 'sample-photo', lat: 37.56, lng: 126.97 }] }
];

test('Explore shows saved public albums before sample photo data', () => {
    assert.deepEqual(
        getPublicSurfaceAlbums('explore', realAlbums, sampleAlbums).map((album) => album.id),
        ['real-public']
    );
});

test('Explore falls back to sample photo data when there are no public albums', () => {
    assert.deepEqual(
        getPublicSurfaceAlbums('explore', [], sampleAlbums).map((album) => album.id),
        ['sample-public-photos']
    );
});

test('non-Explore public surfaces keep the saved public album data', () => {
    assert.deepEqual(
        getPublicSurfaceAlbums('trip', realAlbums, sampleAlbums).map((album) => album.id),
        ['real-public']
    );
});
