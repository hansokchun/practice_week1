import test from 'node:test';
import assert from 'node:assert/strict';

import {
    countSelectedUploadPhotos,
    getSelectedUploadPhotos,
    appendUploadPhotos,
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

test('appendUploadPhotos keeps the existing queue and selects new photos', () => {
    const existing = [{ localId: 'old', name: 'old.jpg', selected: false }];
    const appended = appendUploadPhotos(existing, [{ name: 'new.jpg' }], {
        createLocalId: (file, index) => `new-${index}`,
        createObjectUrl: (file) => `blob://${file.name}`
    });

    assert.deepEqual(appended, [
        existing[0],
        {
            localId: 'new-0',
            name: 'new.jpg',
            url: 'blob://new.jpg',
            file: { name: 'new.jpg' },
            selected: true
        }
    ]);
});
