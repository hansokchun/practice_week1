import test from 'node:test';
import assert from 'node:assert/strict';

import {
    countSelectedUploadPhotos,
    getSelectedUploadPhotos,
    toggleUploadPhotoSelection
} from '../js/upload-photo-selection.mjs';

test('getSelectedUploadPhotos returns only selected photos', () => {
    const photos = [
        { localId: 'a', selected: true },
        { localId: 'b', selected: false },
        { localId: 'c', selected: true }
    ];

    assert.deepEqual(getSelectedUploadPhotos(photos), [photos[0], photos[2]]);
    assert.equal(countSelectedUploadPhotos(photos), 2);
});

test('toggleUploadPhotoSelection flips one photo by local id', () => {
    const photos = [
        { localId: 'a', selected: true },
        { localId: 'b', selected: false }
    ];

    assert.deepEqual(toggleUploadPhotoSelection(photos, 'b'), [
        { localId: 'a', selected: true },
        { localId: 'b', selected: true }
    ]);
});
