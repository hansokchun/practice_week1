import test from 'node:test';
import assert from 'node:assert/strict';

import { getDroppedFiles, getUploadDropzoneClass } from '../js/drag-drop-files.mjs';

test('getDroppedFiles reads files from a drop data transfer', () => {
    const files = [{ name: 'a.jpg' }, { name: 'b.png' }];

    assert.deepEqual(getDroppedFiles({ files }), files);
});

test('getDroppedFiles returns an empty list without dropped files', () => {
    assert.deepEqual(getDroppedFiles(null), []);
    assert.deepEqual(getDroppedFiles({ files: null }), []);
});

test('getUploadDropzoneClass reflects drag state', () => {
    assert.equal(getUploadDropzoneClass(true), 'upload-dropzone is-dragging');
    assert.equal(getUploadDropzoneClass(false), 'upload-dropzone');
});
