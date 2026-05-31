import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('photo info editor no longer shows a selected-photo picker block', () => {
    assert.equal(html.includes('class="location-photo-picker"'), false);
    assert.equal(html.includes('id="location-photo-list"'), false);
    assert.equal(html.includes('id="location-selected-photo-title"'), false);
});

test('photo info editor coordinate inputs avoid browser number validation bubbles', () => {
    assert.match(html, /id="location-lat-input" type="text" inputmode="decimal"/);
    assert.match(html, /id="location-lng-input" type="text" inputmode="decimal"/);
    assert.equal(html.includes('id="location-lat-input" type="number"'), false);
    assert.equal(html.includes('id="location-lng-input" type="number"'), false);
    assert.equal(html.includes('id="location-lat-input" type="text" inputmode="decimal" required'), false);
});

test('photo info editor uses a real map container instead of an iframe embed', () => {
    assert.match(html, /<div id="location-editor-map-canvas" class="location-editor-map-canvas"/);
    assert.equal(html.includes('id="location-editor-map-frame"'), false);
});
