import test from 'node:test';
import assert from 'node:assert/strict';

import { getAlbumPhotoIdsAfterRemoval } from '../js/album-detail-edit-state.mjs';

test('getAlbumPhotoIdsAfterRemoval removes one selected photo from album detail order', () => {
    const ids = getAlbumPhotoIdsAfterRemoval([
        { id: 'p1' },
        { id: 'p2' },
        { id: 'p3' }
    ], 'p2');

    assert.deepEqual(ids, ['p1', 'p3']);
});

test('getAlbumPhotoIdsAfterRemoval ignores missing ids and unknown removal targets', () => {
    const ids = getAlbumPhotoIdsAfterRemoval([
        { id: 'p1' },
        {},
        { id: 'p2' }
    ], 'missing');

    assert.deepEqual(ids, ['p1', 'p2']);
});

test('getAlbumPhotoIdsAfterRemoval handles numeric and string id comparisons', () => {
    const ids = getAlbumPhotoIdsAfterRemoval([
        { id: 1 },
        { id: 2 }
    ], '2');

    assert.deepEqual(ids, [1]);
});
