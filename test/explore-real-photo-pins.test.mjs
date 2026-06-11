import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('js/app.js', 'utf8');

test('Explore renders cluster pins that expand without opening the preview panel', () => {
    const fnStart = source.indexOf('async function renderExploreMapMarkers');
    const fnEnd = source.indexOf('function updatePhotoDetailModal', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /const clusters = getExploreMarkerClusters/);
    assert.match(body, /state\.exploreExpandedClusterPhotoIds/);
    assert.match(body, /getExploreExpandedClusterPositions/);
    assert.match(body, /state\.exploreMarkers = clusters\.map/);
    assert.match(body, /if \(cluster\.count === 1\)/);
    assert.match(body, /position: cluster\.position/);
    assert.match(body, /getExploreMarkerExpansionZoom/);
    assert.match(body, /new maps\.LatLngBounds\(\)/);
    assert.match(body, /cluster\.photos\.forEach/);
    assert.match(body, /map\.fitBounds\(bounds, 96\)/);
    assert.match(body, /maps\.event\.addListenerOnce\(map, 'idle'/);
    assert.match(body, /map\.setZoom\(expansionZoom\)/);
    assert.match(body, /state\.exploreExpandedClusterZoom = expansionZoom/);
    assert.match(body, /\$\('#explore-pin-preview'\)\?\.setAttribute\('hidden', ''\)/);
    assert.doesNotMatch(body, /updateExploreClusterPreview/);
    assert.doesNotMatch(body, /shouldShowExploreClusterLabel\(cluster\)/);
});
