import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EXPLORE_MAP_MIN_ZOOM, getExploreMapOptions, getProfileMapOptions } from '../js/explore-map-options.mjs';

test('profile map keeps its photo frame fixed for all user camera inputs', () => {
    const options = getProfileMapOptions({ center: { lat: 35, lng: 135 }, zoom: 8, mapId: 'profile-map' });
    assert.deepEqual(options.center, { lat: 35, lng: 135 });
    assert.equal(options.zoom, 8);
    assert.equal(options.mapId, 'profile-map');
    assert.equal(options.gestureHandling, 'none');
    assert.equal(options.draggable, false);
    assert.equal(options.scrollwheel, false);
    assert.equal(options.disableDoubleClickZoom, true);
    assert.equal(options.keyboardShortcuts, false);
    assert.equal(options.zoomControl, false);
    assert.equal(getExploreMapOptions().gestureHandling, 'greedy');
});

test('Explore map has a minimum zoom so wheel zoom-out stops at the limit', () => {
    const options = getExploreMapOptions({
        center: { lat: 36.45, lng: 127.85 },
        zoom: 7,
        mapId: 'ikkyee-map'
    });

    assert.equal(EXPLORE_MAP_MIN_ZOOM, 4);
    assert.equal(options.minZoom, EXPLORE_MAP_MIN_ZOOM);
    assert.equal(options.gestureHandling, 'greedy');
    assert.equal(options.mapId, 'ikkyee-map');
});

test('Explore map hides Google default corner controls', () => {
    const options = getExploreMapOptions();

    assert.equal(options.disableDefaultUI, true);
    assert.equal(options.fullscreenControl, false);
    assert.equal(options.streetViewControl, false);
    assert.equal(options.mapTypeControl, false);
    assert.equal(options.rotateControl, false);
    assert.equal(options.scaleControl, false);
    assert.equal(options.zoomControl, false);
    assert.equal(options.cameraControl, false);
    assert.equal(options.panControl, false);
    assert.equal(options.keyboardShortcuts, false);
});

test('Explore map hides non-essential labels and transit route geometry', () => {
    const options = getExploreMapOptions();

    assert.deepEqual(options.styles, [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit.line', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
        { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'administrative.neighborhood', elementType: 'labels', stylers: [{ visibility: 'off' }] }
    ]);
});
