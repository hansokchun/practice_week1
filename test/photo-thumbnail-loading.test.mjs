import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');

test('photo thumbnail grids reveal each image independently without waiting forever', () => {
    assert.match(app, /function revealPhotoThumbnailGridWhenReady\(container\)/);
    assert.match(app, /PHOTO_THUMBNAIL_REVEAL_TIMEOUT_MS = 8000/);
    assert.match(app, /images\.slice\(0, PHOTO_THUMBNAIL_EAGER_COUNT\)/);
    assert.match(app, /image\.decode\(\)/);
    assert.match(app, /image\.classList\.add\('is-thumbnail-ready'\)/);
    assert.match(app, /image\.classList\.add\('is-thumbnail-error'\)/);
    assert.match(app, /window\.setTimeout/);
    assert.doesNotMatch(app, /Promise\.all\(images\.map/);
    assert.doesNotMatch(css, /\.personal-photo-grid\.is-loading-thumbnails img\s*\{[^}]*visibility:\s*hidden;/s);
    assert.match(css, /\.personal-photo-grid img\.is-thumbnail-pending,[^}]*opacity:\s*0;/s);
});

test('personal and liked photo grids use the full panel width without frames', () => {
    assert.doesNotMatch(css, /\.personal-photo-grid\s*\{[^}]*max-width:\s*1040px;/s);
    assert.match(css, /\.personal-photo-card\s*\{[^}]*border:\s*0;[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/s);
    assert.match(css, /body\[data-page="photos"\] \.dashboard-panel,[\s\S]*body\[data-page="liked"\] \.dashboard-panel\s*\{[^}]*border:\s*0;[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;[^}]*padding:\s*0;/s);
});

test('personal and liked full pages use the profile masonry layout', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /id="personal-photo-grid" class="personal-photo-grid photo-masonry-grid"/);
    assert.match(html, /id="liked-photo-full-grid" class="personal-photo-grid liked-photo-full-grid photo-masonry-grid"/);
});
