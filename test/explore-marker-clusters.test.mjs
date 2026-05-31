import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getExploreMarkerClusters,
    getExploreMarkerExpansionZoom,
    shouldShowExploreClusterLabel
} from '../js/explore-marker-clusters.mjs';

test('getExploreMarkerClusters combines nearby photos at low zoom', () => {
    const clusters = getExploreMarkerClusters([
        { id: 'a', lat: 37.5665, lng: 126.9780 },
        { id: 'b', lat: 37.5667, lng: 126.9782 },
        { id: 'c', lat: 35.1796, lng: 129.0756 }
    ], 7, 54);

    assert.equal(clusters.length, 2);
    assert.deepEqual(clusters.map((cluster) => cluster.count).sort(), [1, 2]);
});

test('getExploreMarkerClusters separates nearby photos after zooming in', () => {
    const clusters = getExploreMarkerClusters([
        { id: 'a', lat: 37.5665, lng: 126.9780 },
        { id: 'b', lat: 37.58, lng: 127.0 }
    ], 17, 54);

    assert.equal(clusters.length, 2);
});

test('getExploreMarkerExpansionZoom finds the next zoom level that separates a cluster', () => {
    const photos = [
        { id: 'a', lat: 37.5665, lng: 126.9780 },
        { id: 'b', lat: 37.58, lng: 127.0 }
    ];

    assert.equal(getExploreMarkerExpansionZoom(photos, 7, { radiusPx: 54, maxZoom: 18 }), 12);
});

test('cluster pins use the same logo without numeric labels', () => {
    assert.equal(shouldShowExploreClusterLabel({ count: 4 }), false);
    assert.equal(shouldShowExploreClusterLabel({ count: 1 }), false);
});
