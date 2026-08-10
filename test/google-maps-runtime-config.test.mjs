import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
    normalizeGoogleMapsRuntimeConfig,
    withGoogleMapsMapId
} from '../js/google-maps-runtime-config.mjs';

test('Google Maps runtime config normalizes public browser values', () => {
    assert.deepEqual(normalizeGoogleMapsRuntimeConfig({
        googleMapsApiKey: '  browser-key  ',
        googleMapsMapId: '  map-id  '
    }), {
        apiKey: 'browser-key',
        mapId: 'map-id'
    });
});

test('map options include Map ID only when one is configured', () => {
    const options = {
        center: { lat: 36.45, lng: 127.85 },
        zoom: 7,
        styles: [{ featureType: 'poi' }]
    };

    assert.deepEqual(withGoogleMapsMapId(options, ''), options);
    assert.deepEqual(withGoogleMapsMapId(options, '  ikkyee-map  '), {
        center: options.center,
        zoom: 7,
        mapId: 'ikkyee-map'
    });
});

test('Cloudflare config exposes API key and Map ID without caching', async () => {
    const source = await readFile(new URL('../functions/api/config.js', import.meta.url), 'utf8');
    const { onRequestGet } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
    const response = await onRequestGet({
        env: {
            GOOGLE_MAPS_API_KEY: 'browser-key',
            GOOGLE_MAPS_MAP_ID: 'map-id'
        }
    });

    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await response.json(), {
        googleMapsApiKey: 'browser-key',
        googleMapsMapId: 'map-id'
    });
});
