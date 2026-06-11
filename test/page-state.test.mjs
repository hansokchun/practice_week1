import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createPageStateSnapshot,
    normalizeSavedPageState
} from '../js/page-state.mjs';

test('createPageStateSnapshot persists product section and legacy view state', () => {
    const snapshot = createPageStateSnapshot({
        appSection: 'explore',
        viewMode: 'shared',
        targetUserId: 'user-1',
        profileViewMode: 'albums',
        activeAlbum: 'Jeju',
        currentPhoto: { id: 'photo-1' },
        _targetNickname: 'Mina'
    });

    assert.deepEqual(snapshot, {
        appSection: 'explore',
        viewMode: 'shared',
        targetUserId: 'user-1',
        profileViewMode: 'albums',
        activeAlbum: 'Jeju',
        currentPhotoId: 'photo-1',
        targetNickname: 'Mina'
    });
});

test('normalizeSavedPageState upgrades older saved state without appSection', () => {
    assert.deepEqual(normalizeSavedPageState({ viewMode: 'shared' }), {
        appSection: 'explore',
        viewMode: 'shared'
    });

    assert.deepEqual(normalizeSavedPageState({ viewMode: 'my' }), {
        appSection: 'home',
        viewMode: 'my'
    });
});
