import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const appSource = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('Explore route renders public surfaces so sample map pins are mounted after navigation', () => {
    assert.match(
        appSource,
        /normalized === APP_SECTIONS\.EXPLORE \|\| normalized === 'trip' \|\| normalized === 'profile'\) renderPublicSurfaces\(\);/
    );
});
