import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');

test('stored photos never masquerade as a bundled sample while their signed URL is unavailable', () => {
    assert.match(app, /return photo\.url \|\| photo\.albumCoverUrl \|\| \(!photo\.storage_path && MAIN_BG_2_URL\) \|\| ''/);
});

test('database mutations cannot replace a live signed URL with the stale stored value', () => {
    const start = app.indexOf('function normalizePhotoUpdate(photo, update)');
    const end = app.indexOf('let photoAiAnalysisQueue', start);
    const body = app.slice(start, end);

    assert.match(body, /\.\.\.photo,[\s\S]*\.\.\.update,[\s\S]*url: photo\.url/);
    assert.match(body, /storage_path: update\.storage_path \|\| photo\.storage_path/);
});

test('photo surfaces recover failed signed images instead of applying the sample fallback', async () => {
    assert.match(app, /data-i=/);
    assert.match(app, /async function recoverPhotoImageUrl\(image\)/);
    assert.match(app, /hydratePhotoUrls\(\[photo\]\)/);
    assert.match(app, /photo\.url = refreshed\.url/);
    assert.match(app, /normalizePhotoUpdate\(photo, persistedPhoto\)/);
    assert.match(app, /document\.addEventListener\('error',[\s\S]*recoverPhotoImageUrl\(image\)/);
    assert.match(app, /image\.onload = \(\) => \{ delete image\.dataset\.r; \}/);
});
