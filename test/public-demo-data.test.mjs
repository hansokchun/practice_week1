import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    getPublicDemoAlbumEntries,
    getPublicDemoAlbums,
    getPublicDemoPhotos
} from '../js/public-demo-data.mjs';

test('public demo albums and photos are visible on Explore with real coordinates', () => {
    const albums = getPublicDemoAlbums();
    const photos = albums.flatMap((album) => getPublicDemoPhotos(album));

    assert.deepEqual(albums.map((album) => album.id), ['sample-public-photos']);
    assert.equal(photos.length, 200);
    assert.ok(albums.every((album) => album.visibility === 'public'));
    assert.ok(photos.every((photo) => photo.visibility === 'public' && photo.shared === true));
    assert.ok(photos.every((photo) => Number.isFinite(photo.lat) && Number.isFinite(photo.lng)));
    assert.ok(photos.every((photo) => !photo.id.startsWith('demo-jeju') && !photo.id.startsWith('demo-tokyo') && !photo.id.startsWith('demo-italy')));
});

test('public demo album entries include photos so Explore can render pins immediately', () => {
    const entries = getPublicDemoAlbumEntries();

    assert.equal(entries.length, 1);
    assert.ok(entries.every((album) => album.photos.length === 200));
    assert.ok(entries.every((album) => album.places === album.photos.length));
});
