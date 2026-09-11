import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPhotoDeliverySource, getLandingWarmSlideIndexes } from '../js/photo-delivery.mjs';
import { createPhotoPreviewForUpload, PHOTO_PREVIEW_MAX_BYTES } from '../js/photo-upload-optimizer.mjs';

test('discovery surfaces never fall back to a downloadable original', () => {
    const photo = { url: '/original', thumbnail_url: '/thumb', preview_url: '/preview' };
    assert.equal(getPhotoDeliverySource(photo, 'thumbnail'), '/thumb');
    assert.equal(getPhotoDeliverySource(photo, 'preview'), '/preview');
    assert.equal(getPhotoDeliverySource({ url: '/original' }, 'thumbnail'), '');
    assert.equal(getPhotoDeliverySource({ url: '/original' }, 'preview'), '');
    assert.equal(getPhotoDeliverySource({ ...photo, preview_url: null }, 'preview'), '/thumb');
    assert.equal(getPhotoDeliverySource(photo, 'detail'), '/original');
});

test('landing warms only the current and next image, including wraparound', () => {
    assert.deepEqual(getLandingWarmSlideIndexes(0, 5), [0, 1]);
    assert.deepEqual(getLandingWarmSlideIndexes(4, 5), [4, 0]);
    assert.deepEqual(getLandingWarmSlideIndexes(0, 1), [0]);
    assert.deepEqual(getLandingWarmSlideIndexes(0, 0), []);
});

test('a library visit does not start original-file conversion in the background', () => {
    const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /queueMissingPhotoThumbnailBackfill|backfillMissingPhotoThumbnails/);
    assert.match(source, /data-photo-deferred/);
    assert.doesNotMatch(source, /refreshed\.thumbnail_url \|\| refreshed\.url/);
});

test('screen previews are bounded, downscaled and release decoded image memory', async () => {
    const previousDocument = globalThis.document;
    const previousBitmap = globalThis.createImageBitmap;
    let closed = false;
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage() {} }), toBlob(callback, type, quality) {
        callback(new Blob([new Uint8Array(quality > 0.74 ? PHOTO_PREVIEW_MAX_BYTES + 1 : 200000)], { type }));
    } };
    globalThis.document = { createElement: () => canvas };
    globalThis.createImageBitmap = async () => ({ width: 6000, height: 4000, close() { closed = true; } });
    try {
        const preview = await createPhotoPreviewForUpload(new File(['input'], 'a.jpg', { type: 'image/jpeg' }), 'p');
        assert.ok(preview.size <= PHOTO_PREVIEW_MAX_BYTES);
        assert.equal(preview.type, 'image/jpeg');
        assert.equal(canvas.width, 1920);
        assert.equal(canvas.height, 1280);
        assert.equal(closed, true);
    } finally {
        globalThis.document = previousDocument;
        globalThis.createImageBitmap = previousBitmap;
    }
});
