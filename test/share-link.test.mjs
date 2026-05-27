import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildTripShareUrl,
    parseSharedAlbumId
} from '../js/share-link.mjs';

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
