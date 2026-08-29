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
    assert.match(source, /exploreRenderedZoom:\s*null/);
    assert.match(source, /const renderToken = \+\+state\.exploreMarkerRenderToken/);
    assert.match(source, /if \(renderToken !== state\.exploreMarkerRenderToken\) return/);
});

test('Explore cluster refresh listener is rebound when the map instance changes', () => {
    assert.match(source, /exploreClusterListenerMap:\s*null/);
    assert.match(source, /function bindExploreClusterRefresh\(maps, map\)/);
    assert.match(source, /state\.exploreClusterListenerMap === map && state\.exploreClusterListener/);
    assert.match(source, /state\.exploreClusterListener\?\.remove\?\.\(\)/);
    assert.match(source, /state\.exploreClusterListenerMap = map/);
    assert.match(source, /bindExploreClusterRefresh\(maps, map\)/);
});

test('Explore map idle detects a missed zoom event and refreshes cluster state', () => {
    const ensureStart = source.indexOf('async function ensureExploreMap()');
    const ensureEnd = source.indexOf('function getExplorePinIcon', ensureStart);
    const body = source.slice(ensureStart, ensureEnd);

    assert.match(body, /const settledZoom = Number\(map\.getZoom\?\.\(\)\)/);
    assert.match(body, /settledZoom !== state\.exploreRenderedZoom/);
    assert.match(body, /renderExploreMapMarkers\(state\.exploreMarkerPhotos, state\.exploreSelectedAlbumId\)/);
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
    assert.match(body, /settledZoom !== state\.exploreRenderedZoom/);
    assert.match(body, /!hasPendingMarkerRefresh/);
    assert.match(markerBody, /viewportAction\.type === 'fit'/);
    assert.match(markerBody, /maps\.event\.addListenerOnce\(map, 'idle'/);
    assert.match(markerBody, /mountExploreMapMarkers\(\{ maps, map, clusters, locatedPhotos, currentZoom: settledZoom \}\)/);
});

test('entering Explore resets the old viewport so current own pins are fitted', () => {
    const routeStart = source.indexOf('function renderRoute(section)');
    const routeEnd = source.indexOf('function renderAuthMode', routeStart);
    const routeBody = source.slice(routeStart, routeEnd);

    assert.match(routeBody, /previousRoute !== APP_SECTIONS\.EXPLORE/);
    assert.match(routeBody, /state\.exploreInitializedUserId !== state\.currentUser\.id/);
    assert.match(routeBody, /state\.explorePhotoScope = 'mine'/);
    assert.match(routeBody, /state\.exploreLastBoundsKey = null/);
    assert.match(routeBody, /state\.explorePreserveViewportOnce = false/);
    assert.match(routeBody, /requestAnimationFrame\(\(\) => refreshExploreMapAfterRouteEntry\(\)\)/);
});

test('Explore refreshes marker rendering only after its visible map has been resized', () => {
    const refreshStart = source.indexOf('async function refreshExploreMapAfterRouteEntry()');
    const refreshEnd = source.indexOf('function routeToPublic', refreshStart);
    const refreshBody = source.slice(refreshStart, refreshEnd);

    assert.match(refreshBody, /document\.body\.dataset\.page !== APP_SECTIONS\.EXPLORE/);
    assert.match(refreshBody, /maps\.event\.trigger\(map, 'resize'\)/);
    assert.match(refreshBody, /state\.exploreLastBoundsKey = null/);
    assert.match(refreshBody, /const photos = getExplorePhotoMapItems\(\)/);
    assert.match(refreshBody, /if \(photos\.length\) renderExploreMapMarkers\(photos, state\.exploreSelectedAlbumId\)/);
});

test('non-Explore public surfaces do not pre-render hidden Explore map markers', () => {
    const renderStart = source.indexOf('function renderPublicSurfaces()');
    const renderEnd = source.indexOf('function loadSavedPhotos()', renderStart);
    const renderBody = source.slice(renderStart, renderEnd);

    assert.match(renderBody, /if \(document\.body\.dataset\.page === APP_SECTIONS\.EXPLORE\) \{\s*renderExploreMapMarkers\(locatedPhotos, selected\.id\);\s*\}/s);
});

test('Explore map shows a lightweight pin loading state while markers wait for map idle', () => {
    const html = readFileSync('index.html', 'utf8');
    const css = readFileSync('style.css', 'utf8');

    assert.match(source, /isExploreMarkerLoading:\s*false/);
    assert.match(source, /function setExploreMarkerLoading\(isLoading\)/);
    assert.match(source, /\.explore-map-canvas'\)\?\.classList\.toggle\('is-loading-pins'/);
    assert.match(source, /const loadingMessage = \$\('\.explore-map-pin-loading'\)/);
    assert.match(source, /loadingMessage\.hidden = !state\.isExploreMarkerLoading/);
    assert.match(source, /function scheduleExploreMarkerRefreshAfterIdle\(maps, map\)/);
    assert.match(source, /state\.exploreMarkerRefreshTimer = window\.setTimeout\(refresh, 320\)/);
    assert.match(source, /state\.exploreZoomIdleListener = maps\.event\.addListenerOnce\(map, 'idle', refresh\)/);
    assert.match(source, /const previousMarkers = state\.exploreMarkers/);
    assert.match(source, /state\.exploreMarkers = nextMarkers;[\s\S]*previousMarkers\.forEach/);
    assert.match(source, /state\.exploreRenderedZoom = Number\(currentZoom\)/);
    assert.match(html, /class="explore-map-pin-loading" aria-live="polite" hidden/);
    assert.match(css, /\.explore-map-pin-loading\s*\{[^}]*z-index:\s*3;[^}]*opacity:\s*0;[^}]*border-radius:\s*10px;/s);
    assert.match(css, /\.explore-map-canvas\.is-loading-pins \.explore-map-pin-loading\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*translate\(-50%, 0\);/s);
});
