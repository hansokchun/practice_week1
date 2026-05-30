import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getPublicDemoAlbums, getPublicDemoPhotos } from '../js/public-demo-data.mjs';

test('public demo albums and photos are visible on Explore with real coordinates', () => {
    const albums = getPublicDemoAlbums();
    const photos = albums.flatMap((album) => getPublicDemoPhotos(album));

    assert.ok(albums.length >= 3);
    assert.ok(photos.length >= 6);
    assert.ok(albums.every((album) => album.visibility === 'public'));
    assert.ok(photos.every((photo) => photo.visibility === 'public' && photo.shared === true));
    assert.ok(photos.every((photo) => Number.isFinite(photo.lat) && Number.isFinite(photo.lng)));
});
