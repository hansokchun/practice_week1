import assert from 'node:assert/strict';
import { test } from 'node:test';

import { combinePublicAlbumsWithDemoEntries } from '../js/public-album-entries.mjs';

const demoEntries = [
    { id: 'demo', photos: [{ id: 'demo-photo', lat: 33, lng: 126 }] }
];

test('demo entries stay hidden when there are no public albums', () => {
    assert.deepEqual(combinePublicAlbumsWithDemoEntries([], demoEntries), []);
});

test('demo entries stay hidden when public albums have no located photos', () => {
    const publicAlbums = [{ id: 'real', photos: [{ id: 'p1', lat: null, lng: null }] }];

    assert.deepEqual(
        combinePublicAlbumsWithDemoEntries(publicAlbums, demoEntries).map((album) => album.id),
        ['real']
    );
});

test('demo entries stay hidden when real public located photos exist', () => {
    const publicAlbums = [{ id: 'real', photos: [{ id: 'p1', lat: 37.5, lng: 127 }] }];

    assert.deepEqual(combinePublicAlbumsWithDemoEntries(publicAlbums, demoEntries), publicAlbums);
});
