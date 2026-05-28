import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildAlbumRouteHash,
    buildTripHash,
    buildTripShareUrl,
    getSharedRouteState,
    getShareUrlAlbumId,
    parseSharedAlbumId
} from '../js/share-link.mjs';

test('buildAlbumRouteHash keeps album id on public routes', () => {
    assert.equal(buildAlbumRouteHash('profile', 'album 1'), '#/profile?album=album%201');
    assert.equal(buildAlbumRouteHash('explore', 'demo-jeju'), '#/explore?album=demo-jeju');
});

test('buildAlbumRouteHash falls back to the route without an album id', () => {
    assert.equal(buildAlbumRouteHash('profile', null), '#/profile');
});

test('getShareUrlAlbumId prefers the explicit selected album id', () => {
    assert.equal(getShareUrlAlbumId('private-album', { id: 'public-demo' }), 'private-album');
});

test('getShareUrlAlbumId falls back to the selected public album', () => {
    assert.equal(getShareUrlAlbumId(null, { id: 'public-demo' }), 'public-demo');
});

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

test('getSharedRouteState no longer exposes removed review and share pages', () => {
    assert.deepEqual(getSharedRouteState('#/review?album=demo-jeju'), {
        route: 'home',
        albumId: 'demo-jeju'
    });
    assert.deepEqual(getSharedRouteState('#/share?album=demo-jeju'), {
        route: 'home',
        albumId: 'demo-jeju'
    });
});
