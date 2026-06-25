import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EXPLORE_MAP_MIN_ZOOM, getExploreMapOptions } from '../js/explore-map-options.mjs';

test('Explore map has a minimum zoom so wheel zoom-out stops at the limit', () => {
    const options = getExploreMapOptions({ center: { lat: 36.45, lng: 127.85 }, zoom: 7 });

    assert.equal(EXPLORE_MAP_MIN_ZOOM, 4);
    assert.equal(options.minZoom, EXPLORE_MAP_MIN_ZOOM);
    assert.equal(options.gestureHandling, 'greedy');
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
