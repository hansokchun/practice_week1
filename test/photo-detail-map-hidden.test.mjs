import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('photo detail map is available for every located photo context', () => {
    const html = readFileSync('index.html', 'utf8');
    const source = readFileSync('js/app.js', 'utf8');
    const css = readFileSync('style.css', 'utf8');

    assert.match(html, /id="photo-detail-map"/);
    assert.match(html, /id="photo-detail-map-canvas"/);
    assert.match(source, /const selectedItem = mapItems\.find\(\(item\) => item\.isSelected\);/);
    assert.match(source, /mapShell\?\.setAttribute\('hidden', ''\);/);
    assert.match(source, /mapShell\.removeAttribute\('hidden'\);/);
    assert.match(css, /\.photo-detail-map\[hidden\]\s*\{[^}]*display:\s*none !important;/s);
    assert.match(html, /data-show-photo-on-map/);
});
