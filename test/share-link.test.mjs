import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildTripHash,
    buildTripShareUrl,
    getSharedRouteState,
    parseSharedAlbumId
} from '../js/share-link.mjs';

test('buildTripHash keeps album id in the trip route hash', () => {
    assert.equal(buildTripHash('album 1'), '#/trip?album=album%201');
});

test('buildTripHash falls back to the trip route without an album id', () => {
    assert.equal(buildTripHash(null), '#/trip');
});

test('buildTripShareUrl points at the public trip route for an album', () => {
    assert.equal(
        buildTripShareUrl('https://example.com', 'album 1'),
        'https://example.com/#/trip?album=album%201'
    );
});

test('buildTripShareUrl falls back to the trip route without an album id', () => {
    assert.equal(buildTripShareUrl('https://example.com/', null), 'https://example.com/#/trip');
});

test('parseSharedAlbumId reads album id from route hashes', () => {
    assert.equal(parseSharedAlbumId('#/trip?album=album%201'), 'album 1');
    assert.equal(parseSharedAlbumId('#/explore?album=demo-jeju'), 'demo-jeju');
    assert.equal(parseSharedAlbumId('#/trip'), null);
});

test('getSharedRouteState returns normalized route and optional album id', () => {
    assert.deepEqual(getSharedRouteState('#/trip?album=demo-jeju'), {
        route: 'trip',
        albumId: 'demo-jeju'
    });
    assert.deepEqual(getSharedRouteState('#/explore?album=demo-jeju'), {
        route: 'explore',
        albumId: 'demo-jeju'
    });
    assert.deepEqual(getSharedRouteState('#/unknown?album=demo-jeju'), {
        route: 'home',
        albumId: 'demo-jeju'
    });
});
