import test from 'node:test';
import assert from 'node:assert/strict';

import { getMyphotoAlbumAction } from '../js/myphoto-album-action.mjs';

test('getMyphotoAlbumAction opens public trip for public albums', () => {
    assert.deepEqual(getMyphotoAlbumAction({ albumId: 'a1', visibility: 'public' }), {
        route: 'trip',
        albumId: 'a1'
    });
});

test('getMyphotoAlbumAction opens public trip for link albums', () => {
    assert.deepEqual(getMyphotoAlbumAction({ albumId: 'a1', visibility: 'link' }), {
        route: 'trip',
        albumId: 'a1'
    });
});

test('getMyphotoAlbumAction opens trip for private albums and album builder for drafts', () => {
    assert.deepEqual(getMyphotoAlbumAction({ albumId: 'a1', visibility: 'private' }), {
        route: 'trip',
        albumId: 'a1'
    });
    assert.deepEqual(getMyphotoAlbumAction({ isDraft: true }), {
        route: 'album',
        albumId: null
    });
});
