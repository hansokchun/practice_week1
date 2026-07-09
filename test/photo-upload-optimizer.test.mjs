import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    MAX_OPTIMIZED_PHOTO_EDGE,
    MIN_OPTIMIZED_PHOTO_EDGE,
    PHOTO_OPTIMIZATION_QUALITY_STEPS,
    TARGET_PHOTO_UPLOAD_SIZE_BYTES,
    getConstrainedPhotoSize,
    getOptimizedPhotoFileName,
    getOptimizedPhotoMimeType,
    optimizePhotoForUpload,
    shouldOptimizePhotoForUpload
} from '../js/photo-upload-optimizer.mjs';

test('photo upload optimization targets files over three megabytes only', () => {
    assert.equal(TARGET_PHOTO_UPLOAD_SIZE_BYTES, 3 * 1024 * 1024);
    assert.equal(shouldOptimizePhotoForUpload({ type: 'image/jpeg', size: TARGET_PHOTO_UPLOAD_SIZE_BYTES }), false);
    assert.equal(shouldOptimizePhotoForUpload({ type: 'image/jpeg', size: TARGET_PHOTO_UPLOAD_SIZE_BYTES + 1 }), true);
    assert.equal(shouldOptimizePhotoForUpload({ type: 'application/pdf', size: TARGET_PHOTO_UPLOAD_SIZE_BYTES + 1 }), false);
});

test('photo upload optimization keeps small files unchanged', async () => {
    const file = { name: 'small.jpg', type: 'image/jpeg', size: 640 * 1024 };

    assert.equal(await optimizePhotoForUpload(file), file);
});

test('photo upload optimization uses browser-friendly output formats and names', () => {
    assert.equal(getOptimizedPhotoMimeType({ type: 'image/webp' }), 'image/webp');
    assert.equal(getOptimizedPhotoMimeType({ type: 'image/png' }), 'image/jpeg');
    assert.equal(getOptimizedPhotoFileName('tokyo.walk.png', 'image/jpeg'), 'tokyo.walk.jpg');
    assert.equal(getOptimizedPhotoFileName('tokyo.webp', 'image/webp'), 'tokyo.webp');
    assert.equal(getOptimizedPhotoFileName('', 'image/jpeg'), 'optimized-photo.jpg');
});

test('photo upload optimization constrains long edges while preserving ratio', () => {
    assert.equal(MAX_OPTIMIZED_PHOTO_EDGE, 3200);
    assert.equal(MIN_OPTIMIZED_PHOTO_EDGE, 1600);
    assert.deepEqual(getConstrainedPhotoSize(4000, 3000, 2000), { width: 2000, height: 1500 });
    assert.deepEqual(getConstrainedPhotoSize(1200, 900, 2000), { width: 1200, height: 900 });
    assert.ok(PHOTO_OPTIMIZATION_QUALITY_STEPS.every((quality) => quality > 0 && quality <= 1));
    assert.deepEqual(PHOTO_OPTIMIZATION_QUALITY_STEPS, [0.96, 0.93, 0.9, 0.86, 0.82, 0.76]);
});
