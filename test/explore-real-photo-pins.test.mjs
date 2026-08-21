import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('js/app.js', 'utf8');

function getExploreMarkerMountBody() {
    const fnStart = source.indexOf('function mountExploreMapMarkers');
    const fnEnd = source.indexOf('function scheduleExploreMarkerRefreshAfterIdle', fnStart);
    return source.slice(fnStart, fnEnd);
}

test('Explore renders cluster pins that expand without opening the preview panel', () => {
    const fnStart = source.indexOf('async function renderExploreMapMarkers');
    const fnEnd = source.indexOf('function updatePhotoDetailModal', fnStart);
    const body = getExploreMarkerMountBody();
    const renderBody = source.slice(fnStart, fnEnd);

    assert.match(renderBody, /const clusters = getExploreMarkerClusters/);
    assert.match(source, /function mountExploreMapMarkers\(renderState\)/);
    assert.match(body, /const nextMarkers = clusters\.map/);
    assert.match(body, /if \(cluster\.count === 1\)/);
    assert.match(body, /position: cluster\.position/);
    assert.match(body, /getExploreMarkerExpansionZoom/);
    assert.match(body, /paddingPx: 28/);
    assert.match(body, /maxZoom: 21/);
    assert.match(body, /animateExploreMapCamera\(map/);
    assert.match(body, /isExploreMapCameraAnimating = true/);
    assert.match(body, /isExploreMapCameraAnimating = false/);
    assert.doesNotMatch(body, /maxStep:/);
    assert.doesNotMatch(body, /map\.fitBounds\(bounds, 96\)/);
    assert.doesNotMatch(body, /map\.setZoom\(expansionZoom\)/);
    assert.match(body, /scheduleExploreMarkerRefreshAfterIdle\(maps, map\)/);
    assert.doesNotMatch(body, /clearExploreMapMarkers\(\)/);
    assert.match(body, /state\.exploreMarkers = nextMarkers/);
    assert.match(body, /previousMarkers\.forEach\(\(marker\) => marker\.setMap\(null\)\)/);
    assert.match(body, /\$\('#explore-pin-preview'\)\?\.setAttribute\('hidden', ''\)/);
    assert.doesNotMatch(body, /updateExploreClusterPreview/);
    assert.doesNotMatch(body, /shouldShowExploreClusterLabel\(cluster\)/);
    assert.doesNotMatch(body, /exploreExpandedClusterPhotoIds/);
    assert.doesNotMatch(body, /getExploreExpandedClusterPositions/);
});

test('Explore renders a selected photo overlay when the photo is hidden in a cluster', () => {
    const body = getExploreMarkerMountBody();

    assert.match(body, /const selectedPhoto = locatedPhotos\.find\(\(photo\) => photo\.id === state\.selectedPhotoId\)/);
    assert.match(body, /const selectedPhotoHasVisibleMarker = clusters\.some/);
    assert.match(body, /if \(selectedPhoto && !selectedPhotoHasVisibleMarker\)/);
    assert.match(body, /type: 'photo', selected: true/);
    assert.match(body, /zIndex: 1000/);
    assert.match(body, /nextMarkers\.push\(selectedMarker\)/);
});

test('Explore marks a normal pin selected only when the photo itself is selected', () => {
    const body = getExploreMarkerMountBody();

    assert.match(body, /const selected = Boolean\(photo\.id && photo\.id === state\.selectedPhotoId\)/);
    assert.match(body, /zIndex: selected \? 1000 : 10/);
    assert.doesNotMatch(body, /const selected = photo\.album_id === selectedAlbumId \|\| photo\.id === state\.selectedPhotoId/);
});

test('Explore clears selected pin highlight when the user clicks an empty map area', () => {
    const fnStart = source.indexOf('function clearExplorePinSelection');
    const fnEnd = source.indexOf('function getExplorePinPosition', fnStart);
    const body = source.slice(fnStart, fnEnd);
    const resetStart = source.indexOf('function resetExploreSelectionState');
    const resetEnd = source.indexOf('function clearExplorePinSelection', resetStart);
    const resetBody = source.slice(resetStart, resetEnd);

    assert.match(source, /function resetExploreSelectionState\(\)/);
    assert.match(source, /function clearExplorePinSelection/);
    assert.match(resetBody, /state\.selectedPhotoId = null/);
    assert.match(resetBody, /document\.body\.classList\.remove\('explore-pin-selected'\)/);
    assert.match(body, /resetExploreSelectionState\(\)/);
    assert.match(body, /renderExploreMapMarkers\(state\.exploreMarkerPhotos, state\.exploreSelectedAlbumId\)/);
    assert.match(source, /map\.addListener\('click', \(\) => clearExplorePinSelection\(\)\)/);
});

test('Explore route opens without carrying a stale selected pin from another route', () => {
    const fnStart = source.indexOf('function renderRoute');
    const fnEnd = source.indexOf('function applyRouteHash', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /const routeSharedState = getSharedRouteState\(window\.location\.hash\)/);
    assert.match(body, /normalized === APP_SECTIONS\.EXPLORE && previousRoute !== APP_SECTIONS\.EXPLORE && !routeSharedState\.albumId/);
    assert.match(body, /resetExploreSelectionState\(\)/);
});
