import test from 'node:test';
import assert from 'node:assert/strict';

import { getDroppedFiles, getUploadDropzoneClass, hasFileDrop } from '../js/drag-drop-files.mjs';

test('getDroppedFiles reads files from a drop data transfer', () => {
    const files = [{ name: 'a.jpg' }, { name: 'b.png' }];

    assert.deepEqual(getDroppedFiles({ files }), files);
});

test('getDroppedFiles returns an empty list without dropped files', () => {
    assert.deepEqual(getDroppedFiles(null), []);
    assert.deepEqual(getDroppedFiles({ files: null }), []);
});

test('getDroppedFiles ignores internal thumbnail drags without file data', () => {
    assert.equal(hasFileDrop({ types: ['text/uri-list'], files: [{ name: 'copied.jpg' }] }), false);
    assert.deepEqual(getDroppedFiles({ types: ['text/uri-list'], files: [{ name: 'copied.jpg' }] }), []);
});

test('getDroppedFiles accepts browser file drops', () => {
    const files = [{ name: 'a.jpg' }];
    assert.equal(hasFileDrop({ types: ['Files'], items: [{ kind: 'file' }], files }), true);
    assert.deepEqual(getDroppedFiles({ types: ['Files'], items: [{ kind: 'file' }], files }), files);
});

test('getUploadDropzoneClass reflects drag state', () => {
    assert.equal(getUploadDropzoneClass(true), 'upload-dropzone is-dragging');
    assert.equal(getUploadDropzoneClass(false), 'upload-dropzone');
});
