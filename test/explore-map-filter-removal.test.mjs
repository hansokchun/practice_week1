import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('Explore map no longer renders photo and album filter buttons above the map', () => {
    assert.equal(html.includes('class="map-filter"'), false);
});
