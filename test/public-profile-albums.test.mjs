import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getProfileAlbumStats,
    getProfileAlbums,
    getProfileMapCenter
} from '../js/public-profile-albums.mjs';

const albums = [
    { id: 'a', owner_id: 'u1', photo_count: 10, places: 2, lat: 33, lng: 126 },
    { id: 'b', owner_id: 'u1', photo_count: 5, places: 3, lat: 35, lng: 128 },
    { id: 'c', owner_id: 'u2', photo_count: 20, places: 4, lat: 37, lng: 127 }
];

test('getProfileAlbums returns albums from the selected album author', () => {
    assert.deepEqual(getProfileAlbums(albums, albums[0]).map((album) => album.id), ['a', 'b']);
});

test('getProfileAlbums falls back to all albums when no selected owner exists', () => {
    assert.deepEqual(getProfileAlbums(albums, null).map((album) => album.id), ['a', 'b', 'c']);
});

test('getProfileAlbumStats summarizes only profile albums', () => {
    assert.deepEqual(getProfileAlbumStats([albums[0], albums[1]]), {
        albums: 2,
        photos: 15,
        places: 5
    });
});

test('getProfileMapCenter averages located profile albums', () => {
    assert.deepEqual(getProfileMapCenter([albums[0], albums[1]]), {
        lat: 34,
        lng: 127
    });
});
