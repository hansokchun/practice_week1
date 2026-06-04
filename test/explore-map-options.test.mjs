import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EXPLORE_MAP_MIN_ZOOM, getExploreMapOptions } from '../js/explore-map-options.mjs';

test('Explore map has a minimum zoom so wheel zoom-out stops at the limit', () => {
    const options = getExploreMapOptions({ center: { lat: 36.45, lng: 127.85 }, zoom: 7 });

    assert.equal(EXPLORE_MAP_MIN_ZOOM, 4);
    assert.equal(options.minZoom, EXPLORE_MAP_MIN_ZOOM);
    assert.equal(options.gestureHandling, 'greedy');
});

test('Explore map disables default Google place icons so only photo pins are clickable', () => {
    const options = getExploreMapOptions();

    assert.equal(options.clickableIcons, false);
    assert.deepEqual(options.styles, [
        {
            featureType: 'poi',
            stylers: [{ visibility: 'off' }]
        },
        {
            featureType: 'transit',
            stylers: [{ visibility: 'off' }]
        }
    ]);
});
