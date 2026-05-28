import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getSelectedPersonalPhotos,
    prunePersonalPhotoSelection,
    removeSelectedPersonalPhotos,
    togglePersonalPhotoSelection
} from '../js/personal-photo-selection.mjs';

const photos = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' }
];

test('togglePersonalPhotoSelection adds and removes one photo id', () => {
    assert.deepEqual(togglePersonalPhotoSelection(['a'], 'b'), ['a', 'b']);
    assert.deepEqual(togglePersonalPhotoSelection(['a', 'b'], 'a'), ['b']);
});

test('getSelectedPersonalPhotos returns selected photos in page order', () => {
    assert.deepEqual(getSelectedPersonalPhotos(photos, ['c', 'a']), [photos[0], photos[2]]);
});

test('removeSelectedPersonalPhotos removes selected photos only', () => {
    assert.deepEqual(removeSelectedPersonalPhotos(photos, ['a', 'c']), [photos[1]]);
});

test('prunePersonalPhotoSelection removes ids no longer present', () => {
    assert.deepEqual(prunePersonalPhotoSelection(['a', 'missing', 'c'], photos), ['a', 'c']);
});
