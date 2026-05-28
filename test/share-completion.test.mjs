import test from 'node:test';
import assert from 'node:assert/strict';

import { getShareCompletionHash } from '../js/share-completion.mjs';

test('getShareCompletionHash opens the public trip when visibility is public', () => {
    assert.equal(getShareCompletionHash('public', 'album 1'), '#/trip?album=album%201');
});

test('getShareCompletionHash stays on share settings for private and link visibility', () => {
    assert.equal(getShareCompletionHash('private', 'album 1'), '#/share');
    assert.equal(getShareCompletionHash('link', 'album 1'), '#/share');
});
