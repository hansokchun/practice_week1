import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getExploreMarkerClusters,
    getExploreMarkerClusterBounds,
    getExploreMarkerExpansionZoom,
    getExploreViewportAction,
    shouldRerenderExploreMarkersAfterPinClick,
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

test('getExploreMarkerClusters combines nearby photos across grid cell boundaries', () => {
    const clusters = getExploreMarkerClusters([
        { id: 'a', lat: 37.5665, lng: 126.9780 },
        { id: 'b', lat: 37.5665, lng: 126.9950 }
    ], 12, 54);

    assert.equal(clusters.length, 1);
    assert.equal(clusters[0].count, 2);
});

test('getExploreMarkerClusters separates nearby photos after zooming in', () => {
    const clusters = getExploreMarkerClusters([
        { id: 'a', lat: 37.5665, lng: 126.9780 },
        { id: 'b', lat: 37.58, lng: 127.0 }
    ], 17, 54);

    assert.equal(clusters.length, 2);
});

test('getExploreMarkerClusters spreads photos with identical coordinates at maximum zoom', () => {
    const photos = [
        { id: 'same-a', lat: 37.5796, lng: 126.9770 },
        { id: 'same-b', lat: 37.5796, lng: 126.9770 },
        { id: 'same-c', lat: 37.5796, lng: 126.9770 }
    ];
    const clusters = getExploreMarkerClusters(photos, 20, 54);

    assert.equal(clusters.length, 3);
    assert.deepEqual(clusters.map((cluster) => cluster.count), [1, 1, 1]);
    assert.equal(new Set(clusters.map((cluster) => `${cluster.position.lat},${cluster.position.lng}`)).size, 3);
});

test('getExploreMarkerExpansionZoom jumps to the first zoom where every pin separates', () => {
    const photos = [
        { id: 'a', lat: 37.5665, lng: 126.9780 },
        { id: 'b', lat: 37.58, lng: 127.0 }
    ];

    assert.equal(getExploreMarkerExpansionZoom(photos, 7, { radiusPx: 54, maxZoom: 18 }), 12);
});

test('getExploreMarkerExpansionZoom uses the zoom needed to fully split a multi-photo cluster', () => {
    const photos = [
        { id: 'a', lat: 37.5665, lng: 126.9780 },
        { id: 'b', lat: 37.5667, lng: 126.9782 },
        { id: 'c', lat: 37.58, lng: 127.0 }
    ];

    const expansionZoom = getExploreMarkerExpansionZoom(photos, 7, { radiusPx: 54, maxZoom: 18 });
    const clustersAtZoom = getExploreMarkerClusters(photos, expansionZoom, 54);
    const clustersBeforeZoom = getExploreMarkerClusters(photos, expansionZoom - 1, 54);

    assert.equal(clustersAtZoom.length, photos.length);
    assert.ok(clustersBeforeZoom.length < photos.length);
});

test('getExploreMarkerExpansionZoom can leave visual breathing room between split pins', () => {
    const photos = [
        { id: 'a', lat: 37.5665, lng: 126.9780 },
        { id: 'b', lat: 37.5667, lng: 126.9782 }
    ];
    const compactZoom = getExploreMarkerExpansionZoom(photos, 7, {
        radiusPx: 54,
        maxZoom: 21
    });
    const spaciousZoom = getExploreMarkerExpansionZoom(photos, 7, {
        radiusPx: 54,
        paddingPx: 28,
        maxZoom: 21
    });

    assert.ok(spaciousZoom >= compactZoom);
    assert.equal(getExploreMarkerClusters(photos, spaciousZoom, 82).length, photos.length);
});

test('cluster expansion reaches maximum spread for nearly identical pins in one click', () => {
    const photos = [
        { id: 'a', lat: 37.5665, lng: 126.9780 },
        { id: 'b', lat: 37.5665001, lng: 126.9780001 }
    ];

    assert.equal(getExploreMarkerExpansionZoom(photos, 7, {
        radiusPx: 54,
        maxZoom: 21
    }), 20);
});

test('cluster pins do not show numeric count labels', () => {
    assert.equal(shouldShowExploreClusterLabel({ count: 4 }), false);
    assert.equal(shouldShowExploreClusterLabel({ count: 1 }), false);
});

test('Explore viewport fits only when the marker data set changes', () => {
    const photos = [
        { id: 'a', lat: 33.4, lng: 126.5 },
        { id: 'b', lat: 35.6, lng: 139.7 }
    ];
    const action = getExploreViewportAction(photos, 'old-key');

    assert.equal(action.type, 'fit');
    assert.notEqual(action.boundsKey, 'old-key');
    assert.deepEqual(getExploreViewportAction(photos, action.boundsKey), {
        type: 'none',
        boundsKey: action.boundsKey
    });
});

test('Explore viewport focuses a single photo when the marker data set changes', () => {
    const photos = [
        { id: 'single', lat: 34.77, lng: 127.66 }
    ];

    assert.deepEqual(getExploreViewportAction(photos, 'old-key'), {
        type: 'focus',
        boundsKey: 'single:34.77:127.66',
        center: { lat: 34.77, lng: 127.66 }
    });
    assert.deepEqual(getExploreViewportAction(photos, 'single:34.77:127.66'), {
        type: 'none',
        boundsKey: 'single:34.77:127.66'
    });
});

test('Explore viewport can be preserved when only the photo scope changes', () => {
    const photos = [
        { id: 'mine-a', lat: 33.4, lng: 126.5 },
        { id: 'mine-b', lat: 35.6, lng: 139.7 }
    ];

    const action = getExploreViewportAction(photos, 'old-key', { preserveViewport: true });

    assert.equal(action.type, 'none');
    assert.notEqual(action.boundsKey, 'old-key');
});

test('normal pin clicks keep neighboring pins mounted', () => {
    assert.equal(shouldRerenderExploreMarkersAfterPinClick({ isCluster: false }), false);
    assert.equal(shouldRerenderExploreMarkersAfterPinClick({ isCluster: true }), true);
});

test('cluster click bounds include every grouped pin', () => {
    const bounds = getExploreMarkerClusterBounds([
        { id: 'a', lat: 37.5796, lng: 126.9770 },
        { id: 'b', lat: 37.5826, lng: 126.9830 },
        { id: 'c', lat: 37.5512, lng: 126.9882 }
    ]);

    assert.deepEqual(bounds, {
        north: 37.5826,
        south: 37.5512,
        east: 126.9882,
        west: 126.9770
    });
});
