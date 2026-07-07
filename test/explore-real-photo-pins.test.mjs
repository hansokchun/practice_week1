import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('js/app.js', 'utf8');

test('Explore renders cluster pins that expand without opening the preview panel', () => {
    const fnStart = source.indexOf('async function renderExploreMapMarkers');
    const fnEnd = source.indexOf('function updatePhotoDetailModal', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /const clusters = getExploreMarkerClusters/);
    assert.match(body, /state\.exploreMarkers = clusters\.map/);
    assert.match(body, /if \(cluster\.count === 1\)/);
    assert.match(body, /position: cluster\.position/);
    assert.match(body, /getExploreMarkerExpansionZoom/);
    assert.match(body, /maxZoom: 21/);
    assert.match(body, /new maps\.LatLngBounds\(\)/);
    assert.match(body, /cluster\.photos\.forEach/);
    assert.match(body, /map\.fitBounds\(bounds, 96\)/);
    assert.match(body, /maps\.event\.addListenerOnce\(map, 'idle'/);
    assert.match(body, /map\.setZoom\(expansionZoom\)/);
    assert.match(body, /\$\('#explore-pin-preview'\)\?\.setAttribute\('hidden', ''\)/);
    assert.doesNotMatch(body, /updateExploreClusterPreview/);
    assert.doesNotMatch(body, /shouldShowExploreClusterLabel\(cluster\)/);
    assert.doesNotMatch(body, /exploreExpandedClusterPhotoIds/);
    assert.doesNotMatch(body, /getExploreExpandedClusterPositions/);
});

test('Explore renders a selected photo overlay when the photo is hidden in a cluster', () => {
    const fnStart = source.indexOf('async function renderExploreMapMarkers');
    const fnEnd = source.indexOf('function updatePhotoDetailModal', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /const selectedPhoto = locatedPhotos\.find\(\(photo\) => photo\.id === state\.selectedPhotoId\)/);
    assert.match(body, /const selectedPhotoHasVisibleMarker = clusters\.some/);
    assert.match(body, /if \(selectedPhoto && !selectedPhotoHasVisibleMarker\)/);
    assert.match(body, /type: 'photo', selected: true/);
    assert.match(body, /zIndex: 1000/);
    assert.match(body, /state\.exploreMarkers\.push\(selectedMarker\)/);
});

test('Explore marks a normal pin selected only when the photo itself is selected', () => {
    const fnStart = source.indexOf('async function renderExploreMapMarkers');
    const fnEnd = source.indexOf('function updatePhotoDetailModal', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /const selected = Boolean\(photo\.id && photo\.id === state\.selectedPhotoId\)/);
    assert.match(body, /zIndex: selected \? 1000 : 10/);
    assert.doesNotMatch(body, /const selected = photo\.album_id === selectedAlbumId \|\| photo\.id === state\.selectedPhotoId/);
});

test('Explore clears selected pin highlight when the user clicks an empty map area', () => {
    const fnStart = source.indexOf('function clearExplorePinSelection');
    const fnEnd = source.indexOf('function getExplorePinPosition', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(source, /function clearExplorePinSelection/);
    assert.match(body, /state\.selectedPhotoId = null/);
    assert.match(body, /document\.body\.classList\.remove\('explore-pin-selected'\)/);
    assert.match(body, /renderExploreMapMarkers\(state\.exploreMarkerPhotos, state\.exploreSelectedAlbumId\)/);
    assert.match(source, /map\.addListener\('click', \(\) => clearExplorePinSelection\(\)\)/);
});
