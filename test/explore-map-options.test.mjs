import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EXPLORE_MAP_MIN_ZOOM, getExploreMapOptions } from '../js/explore-map-options.mjs';

test('Explore map has a minimum zoom so wheel zoom-out stops at the limit', () => {
    const options = getExploreMapOptions({ center: { lat: 36.45, lng: 127.85 }, zoom: 7 });

    assert.equal(EXPLORE_MAP_MIN_ZOOM, 4);
    assert.equal(options.minZoom, EXPLORE_MAP_MIN_ZOOM);
    assert.equal(options.gestureHandling, 'greedy');
});

test('Explore map hides default Google POI markers so only public photo pins look clickable', () => {
    const options = getExploreMapOptions();
    const poiStyle = options.styles.find((style) => style.featureType === 'poi');

    assert.deepEqual(poiStyle, {
        featureType: 'poi',
        elementType: 'labels.icon',
        stylers: [{ visibility: 'off' }]
    });
});
