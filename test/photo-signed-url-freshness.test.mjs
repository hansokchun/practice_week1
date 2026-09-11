import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    PHOTO_SIGNED_URL_TTL_SECONDS,
    reusePhotoSignedUrls,
    shouldRefreshPhotoSignedUrl
} from '../js/photo-signed-url-freshness.mjs';

test('metadata refresh reuses valid image URLs but never stale or changed access paths', () => {
    const now = 1000;
    const previous = { id: 'p', owner_id: 'a', visibility: 'public', storage_path: 'a/p.jpg', thumbnail_path: 'a/thumbnails/p.jpg', url: 'signed-original', thumbnail_url: 'signed-thumb', signed_url_expires_at: now + 900000 };
    const row = { ...previous, url: 'stored-old-url', thumbnail_url: null, signed_url_expires_at: null, description: 'new' };
    const reused = reusePhotoSignedUrls(row, previous, now);
    assert.equal(reused.url, 'signed-original');
    assert.equal(reused.thumbnail_url, 'signed-thumb');
    assert.equal(reused.description, 'new');
    for (const change of [{ owner_id: 'b' }, { visibility: 'private' }, { storage_path: 'a/new.jpg' }]) {
        const changed = { ...row, ...change };
        assert.equal(reusePhotoSignedUrls(changed, previous, now), changed);
    }
    assert.equal(reusePhotoSignedUrls(row, previous, now + 900000), row);
    assert.equal(reusePhotoSignedUrls({ ...row, thumbnail_path: 'a/new-thumb.jpg' }, previous, now).thumbnail_url, null);
});

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
