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

test('Explore map refreshes markers after the map settles on first load', () => {
    const ensureStart = source.indexOf('async function ensureExploreMap()');
    const ensureEnd = source.indexOf('function getExplorePinIcon', ensureStart);
    const body = source.slice(ensureStart, ensureEnd);

    assert.match(body, /state\.exploreMap\.addListener\('idle'/);
    assert.match(body, /document\.body\.dataset\.page === APP_SECTIONS\.EXPLORE/);
    assert.match(body, /state\.exploreMarkerPhotos\.length/);
    assert.match(body, /renderExploreMapMarkers\(state\.exploreMarkerPhotos, state\.exploreSelectedAlbumId\)/);
});
