import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('js/app.js', 'utf8');

test('logged-out Explore resolves the public photo scope before collecting markers', () => {
    const renderStart = source.indexOf('function renderPublicSurfaces()');
    const renderEnd = source.indexOf('function loadSavedPhotos()', renderStart);
    const body = source.slice(renderStart, renderEnd);

    assert.ok(body.indexOf('renderExplorePhotoScopeControls();') < body.indexOf('const explorePhotos = getExplorePhotoMapItems();'));
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
    const markerStart = source.indexOf('async function renderExploreMapMarkers');
    const markerEnd = source.indexOf('async function ensureProfileMap', markerStart);
    const markerBody = source.slice(markerStart, markerEnd);

    assert.match(body, /state\.exploreMap\.addListener\('idle'/);
    assert.match(body, /document\.body\.dataset\.page === APP_SECTIONS\.EXPLORE/);
    assert.match(body, /state\.exploreMarkerPhotos\.length/);
    assert.match(body, /renderExploreDiscoveryPanel\(state\.exploreMarkerPhotos\)/);
    assert.doesNotMatch(body, /renderExploreMapMarkers\(state\.exploreMarkerPhotos, state\.exploreSelectedAlbumId\)/);
    assert.match(markerBody, /viewportAction\.type === 'fit'/);
    assert.match(markerBody, /maps\.event\.addListenerOnce\(map, 'idle'/);
    assert.match(markerBody, /mountExploreMapMarkers\(\{ maps, map, clusters, locatedPhotos, currentZoom: settledZoom \}\)/);
});

test('Explore map shows a lightweight pin loading state while markers wait for map idle', () => {
    const html = readFileSync('index.html', 'utf8');
    const css = readFileSync('style.css', 'utf8');

    assert.match(source, /isExploreMarkerLoading:\s*false/);
    assert.match(source, /function setExploreMarkerLoading\(isLoading\)/);
    assert.match(source, /\.explore-map-canvas'\)\?\.classList\.toggle\('is-loading-pins'/);
    assert.match(source, /function scheduleExploreMarkerRefreshAfterIdle\(maps, map\)/);
    assert.match(html, /class="explore-map-pin-loading" aria-live="polite"/);
    assert.match(css, /\.explore-map-pin-loading\s*\{[^}]*z-index:\s*3;[^}]*opacity:\s*0;[^}]*border-radius:\s*10px;/s);
    assert.match(css, /\.explore-map-canvas\.is-loading-pins \.explore-map-pin-loading\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*translate\(-50%, 0\);/s);
});
