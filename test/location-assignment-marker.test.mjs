import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('nearby photo markers stay readable at overview zoom', () => {
    assert.match(app, /zoom >= 18 \? 'detail' : zoom >= 15 \? 'compact' : 'overview'/);
});

test('nearby photo markers shrink and hide labels when the map is enlarged', () => {
    assert.match(app, /addListener\('zoom_changed', syncNearbyPins\)/);
});
