import test from 'node:test';
import assert from 'node:assert/strict';

import { getAlbumEditorPhotoIds, getAlbumEditorPhotos } from '../js/album-editor-state.mjs';

test('getAlbumEditorPhotoIds prefers photos already attached to the selected album object', () => {
    const ids = getAlbumEditorPhotoIds({
        id: 'album-1',
        title: 'Jeju',
        photos: [{ id: 'p2' }, { id: 'p1' }]
    }, [
        { id: 'fallback', album_id: 'album-1' }
    ]);

    assert.deepEqual(ids, ['p2', 'p1']);
});

test('getAlbumEditorPhotoIds falls back to saved photos linked by album id or title', () => {
    const ids = getAlbumEditorPhotoIds({ id: 'album-1', title: 'Jeju' }, [
        { id: 'p1', album_id: 'album-1' },
        { id: 'p2', album: 'Jeju' },
        { id: 'p3', album_id: 'album-2' }
    ]);

    assert.deepEqual(ids, ['p1', 'p2']);
});

test('getAlbumEditorPhotos returns photos in builder id order', () => {
    const photos = getAlbumEditorPhotos(['p2', 'p1'], [
        { id: 'p1', name: 'one' },
        { id: 'p2', name: 'two' }
    ]);

    assert.deepEqual(photos.map((photo) => photo.name), ['two', 'one']);
});
