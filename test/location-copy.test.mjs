import test from 'node:test';
import assert from 'node:assert/strict';

import { formatGoogleMapsLocation, getGoogleMapsLocationUrl } from '../js/location-copy.mjs';

test('formatGoogleMapsLocation returns Google Maps searchable coordinates', () => {
    assert.equal(formatGoogleMapsLocation(37.566535, 126.9779692), '37.566535,126.977969');
});

test('formatGoogleMapsLocation accepts numeric strings', () => {
    assert.equal(formatGoogleMapsLocation('35.1795543', '129.0756416'), '35.179554,129.075642');
});

test('formatGoogleMapsLocation rejects missing or invalid coordinates', () => {
    assert.equal(formatGoogleMapsLocation(null, 126.9779692), null);
    assert.equal(formatGoogleMapsLocation(37.566535, undefined), null);
    assert.equal(formatGoogleMapsLocation('abc', 126.9779692), null);
    assert.equal(formatGoogleMapsLocation(0, 0), null);
});

test('getGoogleMapsLocationUrl opens a pinned Google Maps search without an API key', () => {
    assert.equal(
        getGoogleMapsLocationUrl(37.566535, 126.9779692),
        'https://www.google.com/maps/search/?api=1&query=37.566535%2C126.977969'
    );
    assert.equal(getGoogleMapsLocationUrl(null, 126.9779692), null);
});
