import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('myphoto album cards use a compact stacked travel album layout', () => {
    const css = readFileSync('style.css', 'utf8');
    const app = readFileSync('js/app.js', 'utf8');

    assert.match(css, /\.album-list\s*\{[^}]*justify-items:\s*start;/s);
    assert.match(css, /\.album-row\s*\{[^}]*grid-template-columns:\s*minmax\(200px,\s*248px\)\s*minmax\(260px,\s*360px\);/s);
    assert.match(css, /\.album-row\s*\{[^}]*width:\s*min\(100%,\s*608px\);[^}]*overflow:\s*hidden;/s);
    assert.match(css, /\.album-cover-stack\s*\{[^}]*position:\s*relative;[^}]*height:\s*100%;[^}]*min-height:\s*248px;/s);
    assert.match(css, /\.album-cover-layer--back\s*\{[^}]*transform:\s*rotate\(-3deg\);/s);
    assert.match(css, /\.album-cover-layer--middle\s*\{[^}]*transform:\s*rotate\(1\.6deg\);/s);
    assert.match(css, /\.album-cover-layer--front\s*\{[^}]*z-index:\s*3;/s);
    assert.match(css, /\.album-cover-layer--blank\s*\{[^}]*linear-gradient/s);
    assert.match(css, /\.album-row-content\s*\{[^}]*align-content:\s*center;[^}]*gap:\s*10px;/s);
    assert.match(css, /\.album-row small\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*gap:\s*6px;[^}]*border-top:\s*1px solid var\(--line\);/s);
    assert.match(css, /\.album-count-icon\s*\{[^}]*position:\s*relative;[^}]*width:\s*17px;[^}]*height:\s*16px;[^}]*color:\s*var\(--teal\);/s);
    assert.match(css, /\.album-count-icon::before,[\s\S]*\.album-count-icon::after\s*\{[^}]*border:\s*1\.8px solid currentColor;[^}]*border-radius:\s*4px;/s);
    assert.match(css, /\.album-row:hover,\s*\.album-row:focus-visible\s*\{[^}]*transform:\s*translateY\(-2px\);/s);
    assert.match(css, /@media \(max-width:\s*860px\)[\s\S]*\.album-row\s*\{[^}]*grid-template-columns:\s*1fr;[^}]*width:\s*100%;/s);
    assert.match(app, /function getUniqueAlbumCoverSources\(sources, limit = 3\)/);
    assert.match(app, /uniqueSources\.includes\(source\)/);
    assert.match(app, /function getAlbumCoverLayerMarkup\(source, layerClass\)/);
    assert.match(app, /album-cover-layer--blank/);
    assert.match(app, /function getAlbumCoverStackMarkup\(sources, altText\)/);
    assert.match(app, /class="album-cover-stack"/);
    assert.match(app, /class="album-row-content"/);
    assert.match(app, /const myPhotos = getMySavedPhotos\(\);[\s\S]*const albumPhotos = myPhotos\.filter\(\(photo\) => photo\.album_id === album\.id\);/);
    assert.match(app, /getAlbumCoverStackMarkup\(\[album\.cover_url, \.\.\.albumPhotos\.map\(\(photo\) => photo\.url\)\], album\.title\)/);
    assert.match(app, /<span class="album-count-icon" aria-hidden="true"><\/span>\$\{formatPhotoCount\(album\.photo_count\)\}<\/small>/);
    assert.doesNotMatch(app.slice(app.indexOf('function renderSavedAlbumRows'), app.indexOf('function renderSavedPhotoAlbums')), /<span class="material-symbols-outlined">\$\{visibilityIcon\}<\/span>/);
});
