import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getLocatedPublicAlbums } from '../js/explore-album-markers.mjs';

test('Explore album markers use album coordinates and ignore unlocated albums', () => {
    const albums = [
        { id: 'album-a', title: 'A', lat: 37.5, lng: 127.0, photos: [{ id: 'p1' }] },
        { id: 'album-b', title: 'B', lat: null, lng: null, photos: [{ id: 'p2' }] }
    ];

    const [marker] = getLocatedPublicAlbums(albums);

    assert.deepEqual(marker, {
        id: 'album-a',
        title: 'A',
        note: '',
        cover_url: undefined,
        owner_id: undefined,
        visibility: undefined,
        lat: 37.5,
        lng: 127.0,
        photo_count: 1,
        places: 1,
        type: 'album'
    });
});
