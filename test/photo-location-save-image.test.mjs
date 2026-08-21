import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');

test('saving location preserves the working signed thumbnail URL', () => {
    const start = app.indexOf('async function saveManualLocation(event)');
    const end = app.indexOf('async function searchExploreMap', start);
    const body = app.slice(start, end);

    assert.match(body, /const updated = normalizeSavedPhoto\(\{[\s\S]*\.\.\.photo,[\s\S]*\.\.\.data,[\s\S]*url: photo\.url/);
    assert.match(body, /state\.savedPhotos = state\.savedPhotos\.map/);
});
