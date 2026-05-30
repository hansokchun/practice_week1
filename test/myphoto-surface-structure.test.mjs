import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('myphoto dashboard no longer renders the stats strip', () => {
    const html = readFileSync('index.html', 'utf8');

    assert.equal(html.includes('class="stats-grid"'), false);
    assert.equal(html.includes('id="stat-photo-count"'), false);
    assert.equal(html.includes('id="stat-located-count"'), false);
    assert.equal(html.includes('id="stat-missing-count"'), false);
    assert.equal(html.includes('id="stat-album-count"'), false);
});

test('photo detail modal keeps the right information panel inside the viewport', () => {
    const css = readFileSync('style.css', 'utf8');

    assert.match(css, /\.photo-detail-card section\s*\{[^}]*min-width:\s*0;/s);
    assert.match(css, /\.photo-detail-card\s*\{[^}]*width:\s*min\(1120px,\s*calc\(100vw - 32px\)\);/s);
});
