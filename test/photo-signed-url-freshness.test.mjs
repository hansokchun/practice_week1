import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    PHOTO_SIGNED_URL_TTL_SECONDS,
    shouldRefreshPhotoSignedUrl
} from '../js/photo-signed-url-freshness.mjs';

test('signed photo URLs stay reusable until the final refresh window', () => {
    const now = 1_000_000;
    const photo = {
        storage_path: 'owner/photo.jpg',
        url: 'https://example.com/signed-photo',
        signed_url_expires_at: now + 120_000
    };

    assert.equal(PHOTO_SIGNED_URL_TTL_SECONDS, 900);
    assert.equal(shouldRefreshPhotoSignedUrl(photo, now), false);
    assert.equal(shouldRefreshPhotoSignedUrl({ ...photo, signed_url_expires_at: now + 30_000 }, now), true);
});

test('stored photos refresh missing or untracked URLs while bundled images do not', () => {
    const now = 1_000_000;

    assert.equal(shouldRefreshPhotoSignedUrl({ storage_path: 'owner/photo.jpg' }, now), true);
    assert.equal(shouldRefreshPhotoSignedUrl({ storage_path: 'owner/photo.jpg', url: 'legacy-url' }, now), true);
    assert.equal(shouldRefreshPhotoSignedUrl({ url: '/images/sample.jpg' }, now), false);
});

test('photo pagination refreshes expiring signed URLs for only the visible page', async () => {
    const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
    const auth = await readFile(new URL('../auth.js', import.meta.url), 'utf8');

    assert.match(auth, /createSignedUrls\(paths, PHOTO_SIGNED_URL_TTL_SECONDS\)/);
    assert.match(auth, /signed_url_expires_at: expiresAt/);
    assert.match(app, /function refreshVisiblePhotoPageUrls\(pageKey, requestedPage\)/);
    assert.match(app, /getPhotoPage\(sourcePhotos, requestedPage\)/);
    assert.match(app, /filter\(\(photo\) => shouldRefreshPhotoSignedUrl\(photo\)\)/);
    assert.match(app, /refreshVisiblePhotoPageUrls\('personal', state\.personalPhotoPage\)/);
    assert.match(app, /refreshVisiblePhotoPageUrls\('liked', state\.likedPhotoPage\)/);
});
