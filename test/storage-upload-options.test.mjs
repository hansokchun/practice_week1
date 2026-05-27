import test from 'node:test';
import assert from 'node:assert/strict';

import { getStorageUploadOptions } from '../js/storage-upload-options.mjs';

test('getStorageUploadOptions keeps photo uploads insert-only by default', () => {
    assert.deepEqual(getStorageUploadOptions({ type: 'image/webp' }), {
        contentType: 'image/webp',
        upsert: false
    });
});

test('getStorageUploadOptions falls back to jpeg content type', () => {
    assert.deepEqual(getStorageUploadOptions({}), {
        contentType: 'image/jpeg',
        upsert: false
    });
});
