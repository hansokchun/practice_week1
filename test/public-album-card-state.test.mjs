import test from 'node:test';
import assert from 'node:assert/strict';

import { getPublicAlbumCardClass } from '../js/public-album-card-state.mjs';

test('getPublicAlbumCardClass marks the selected public album', () => {
    assert.equal(getPublicAlbumCardClass('a1', 'a1'), 'is-selected');
});

test('getPublicAlbumCardClass leaves unselected albums unmarked', () => {
    assert.equal(getPublicAlbumCardClass('a1', 'a2'), '');
});

test('getPublicAlbumCardClass is stable when ids are missing', () => {
    assert.equal(getPublicAlbumCardClass(null, 'a2'), '');
    assert.equal(getPublicAlbumCardClass('a1', null), '');
});
