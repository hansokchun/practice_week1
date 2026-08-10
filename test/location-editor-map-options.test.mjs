import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getLocationEditorMapOptions } from '../js/location-editor-map-options.mjs';

test('photo info editor map allows wheel zoom without holding control', () => {
    const options = getLocationEditorMapOptions(
        { lat: 33.450701, lng: 126.570667 },
        { mapId: 'ikkyee-map' }
    );

    assert.equal(options.gestureHandling, 'greedy');
    assert.equal(options.zoom, 13);
    assert.equal(options.center.lat, 33.450701);
    assert.equal(options.center.lng, 126.570667);
    assert.equal(options.disableDefaultUI, true);
    assert.equal(options.mapTypeControl, false);
    assert.equal(options.zoomControl, false);
    assert.equal(options.scaleControl, false);
    assert.equal(options.keyboardShortcuts, false);
    assert.equal(options.clickableIcons, false);
    assert.equal(options.mapId, 'ikkyee-map');
});
