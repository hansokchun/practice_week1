import test from 'node:test';
import assert from 'node:assert/strict';

import { getShareCompletionHash, getShareTargetAlbumId } from '../js/share-completion.mjs';

test('getShareCompletionHash opens the public trip when visibility is public', () => {
    assert.equal(getShareCompletionHash('public', 'album 1'), '#/trip?album=album%201');
});

test('getShareCompletionHash returns to Home for private and link visibility', () => {
    assert.equal(getShareCompletionHash('private', 'album 1'), '#/');
    assert.equal(getShareCompletionHash('link', 'album 1'), '#/');
});

test('getShareCompletionHash falls back to Home without an album id', () => {
    assert.equal(getShareCompletionHash('public', null), '#/');
});

test('getShareTargetAlbumId prefers the updated album then falls back to the draft album', () => {
    assert.equal(getShareTargetAlbumId({ id: 'updated' }, { id: 'draft' }), 'updated');
    assert.equal(getShareTargetAlbumId(null, { id: 'draft' }), 'draft');
    assert.equal(getShareTargetAlbumId(null, null), null);
});
