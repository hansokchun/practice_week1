import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');

test('saving location preserves the working signed thumbnail URL', () => {
    const start = app.indexOf('async function saveManualLocation(event)');
    const end = app.indexOf('async function searchExploreMap', start);
    const body = app.slice(start, end);

    assert.match(body, /const updated = normalizePhotoUpdate\(photo, data\)/);
    assert.match(body, /state\.savedPhotos = state\.savedPhotos\.map/);
});

test('photo database updates preserve the current signed URL centrally', () => {
    const start = app.indexOf('function normalizePhotoUpdate(photo, update)');
    const end = app.indexOf('let photoAiAnalysisQueue', start);
    const body = app.slice(start, end);

    assert.match(body, /\.\.\.photo,[\s\S]*\.\.\.update,[\s\S]*url: photo\.url/);
    assert.match(body, /storage_path: update\.storage_path \|\| photo\.storage_path/);
});
