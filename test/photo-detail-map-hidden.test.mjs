import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('photo detail map is hidden when the selected photo has no usable location', () => {
    const source = readFileSync('js/app.js', 'utf8');
    const css = readFileSync('style.css', 'utf8');

    assert.match(source, /const mapUrl = getPhotoMapUrl\(photo\);/);
    assert.match(source, /mapFrame\.removeAttribute\('src'\);/);
    assert.match(source, /map\.setAttribute\('hidden', ''\);/);
    assert.match(css, /\.photo-detail-map\[hidden\]\s*\{[^}]*display:\s*none !important;/s);
});
