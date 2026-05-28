import test from 'node:test';
import assert from 'node:assert/strict';

import { selectAlbumForSharing } from '../js/album-sharing-selection.mjs';

const albums = [
    { id: 'old', owner_id: 'user-1', title: 'Old trip' },
    { id: 'draft', owner_id: 'user-1', title: 'Jeju weekend' },
    { id: 'other-user', owner_id: 'user-2', title: 'Jeju weekend' }
];

test('selectAlbumForSharing prefers an owned album matching the current draft title', () => {
    assert.equal(selectAlbumForSharing(albums, 'user-1', 'Jeju weekend')?.id, 'draft');
});

test('selectAlbumForSharing falls back to the latest owned album', () => {
    assert.equal(selectAlbumForSharing(albums, 'user-1', 'No match')?.id, 'old');
});

test('selectAlbumForSharing ignores albums from other users', () => {
    assert.equal(selectAlbumForSharing(albums, 'user-3', 'Old trip'), null);
});
