import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('js/app.js', 'utf8');

test('Explore renders Google markers from clustered public photos', () => {
    const fnStart = source.indexOf('async function renderExploreMapMarkers');
    const fnEnd = source.indexOf('function updatePhotoDetailModal', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /const clusters = getExploreMarkerClusters/);
    assert.match(body, /state\.exploreMarkers = clusters\.map/);
    assert.match(body, /if \(cluster\.count === 1\)/);
    assert.match(body, /updateExploreClusterPreview\(cluster\.photos\)/);
    assert.match(body, /fitBounds\(bounds, 112\)/);
    assert.match(body, /getExploreMarkerExpansionZoom/);
});
