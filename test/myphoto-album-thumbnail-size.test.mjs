import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('myphoto album cards use a wide stacked travel album layout', () => {
    const css = readFileSync('style.css', 'utf8');
    const app = readFileSync('js/app.js', 'utf8');

    assert.match(css, /\.album-list\s*\{[^}]*justify-items:\s*start;/s);
    assert.match(css, /\.album-row\s*\{[^}]*grid-template-columns:\s*minmax\(320px,\s*500px\)\s*minmax\(0,\s*1fr\);/s);
    assert.match(css, /\.album-row\s*\{[^}]*width:\s*min\(100%,\s*1120px\);[^}]*min-height:\s*340px;/s);
    assert.match(css, /\.album-cover-stack\s*\{[^}]*position:\s*relative;[^}]*min-height:\s*292px;/s);
    assert.match(css, /\.album-cover-layer--back\s*\{[^}]*transform:\s*rotate\(-3deg\);/s);
    assert.match(css, /\.album-cover-layer--middle\s*\{[^}]*transform:\s*rotate\(1\.6deg\);/s);
    assert.match(css, /\.album-cover-layer--front\s*\{[^}]*z-index:\s*3;/s);
    assert.match(css, /\.album-row-content\s*\{[^}]*align-content:\s*center;[^}]*gap:\s*18px;/s);
    assert.match(css, /\.album-row small\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*gap:\s*10px;[^}]*border-top:\s*1px solid var\(--line\);/s);
    assert.match(css, /\.album-count-icon\s*\{[^}]*position:\s*relative;[^}]*width:\s*22px;[^}]*height:\s*20px;[^}]*color:\s*var\(--teal\);/s);
    assert.match(css, /\.album-count-icon::before,[\s\S]*\.album-count-icon::after\s*\{[^}]*border:\s*2px solid currentColor;[^}]*border-radius:\s*5px;/s);
    assert.match(css, /\.album-row:hover,\s*\.album-row:focus-visible\s*\{[^}]*transform:\s*translateY\(-2px\);/s);
    assert.match(css, /@media \(max-width:\s*860px\)[\s\S]*\.album-row\s*\{[^}]*grid-template-columns:\s*1fr;[^}]*width:\s*100%;/s);
    assert.match(app, /function getAlbumCoverStackMarkup\(sources, altText\)/);
    assert.match(app, /class="album-cover-stack"/);
    assert.match(app, /class="album-row-content"/);
    assert.match(app, /<span class="album-count-icon" aria-hidden="true"><\/span>\$\{formatPhotoCount\(album\.photo_count\)\}<\/small>/);
    assert.doesNotMatch(app.slice(app.indexOf('function renderSavedAlbumRows'), app.indexOf('function renderSavedPhotoAlbums')), /<span class="material-symbols-outlined">\$\{visibilityIcon\}<\/span>/);
});
