import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');

const optimizedLandingAssets = [
    'home-section-divider',
    'home-map-memory-board',
    'home-travel-replay',
    'home-explore-guide'
];

test('landing feature artwork serves smaller jpeg sources with png fallbacks', () => {
    optimizedLandingAssets.forEach((name) => {
        assert.match(html, new RegExp(`images/${name}\\.jpg[\\s\\S]*images/${name}\\.png`));
        assert.ok(
            statSync(`images/${name}.jpg`).size < statSync(`images/${name}.png`).size,
            `${name}.jpg should stay smaller than its png fallback`
        );
    });
});
