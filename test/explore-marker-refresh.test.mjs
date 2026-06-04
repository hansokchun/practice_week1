import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('js/app.js', 'utf8');

test('logged-out Explore resolves the public photo scope before collecting markers', () => {
    const renderStart = source.indexOf('function renderPublicSurfaces()');
    const renderEnd = source.indexOf('function loadSavedPhotos()', renderStart);
    const body = source.slice(renderStart, renderEnd);

    assert.ok(body.indexOf('renderExplorePhotoScopeControls();') < body.indexOf('const explorePhotos = getPublicPhotoMapItems();'));
});

test('Explore map marker rendering ignores stale async renders', () => {
    assert.match(source, /exploreMarkerRenderToken:\s*0/);
    assert.match(source, /const renderToken = \+\+state\.exploreMarkerRenderToken/);
    assert.match(source, /if \(renderToken !== state\.exploreMarkerRenderToken\) return/);
});
