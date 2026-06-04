import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createPendingAuthState,
    getPendingAuthAction,
    restorePendingAuthContext,
    setPendingAuthAction,
    storePendingAuthContext,
    takePendingAuthAction
} from '../js/pending-auth-action.mjs';

test('pending auth actions accept only supported follow-up actions', () => {
    const state = createPendingAuthState();

    assert.equal(setPendingAuthAction(state, 'persist-upload'), 'persist-upload');
    assert.equal(getPendingAuthAction(state), 'persist-upload');
    assert.equal(setPendingAuthAction(state, 'save-album'), 'save-album');
    assert.equal(getPendingAuthAction(state), 'save-album');
    assert.equal(setPendingAuthAction(state, 'unknown'), null);
    assert.equal(getPendingAuthAction(state), null);
});

test('takePendingAuthAction returns and clears the saved action', () => {
    const state = createPendingAuthState();

    setPendingAuthAction(state, 'save-share');

    assert.equal(takePendingAuthAction(state), 'save-share');
    assert.equal(takePendingAuthAction(state), null);
});

test('pending auth context can be stored and restored after OAuth redirect', () => {
    const state = createPendingAuthState();
    const storage = new Map();
    const adapter = {
        getItem: (key) => storage.get(key) || null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key)
    };

    setPendingAuthAction(state, 'save-share');
    storePendingAuthContext(adapter, state, { route: 'share', visibility: 'public', albumId: 'album-1' });

    const restored = createPendingAuthState();
    assert.deepEqual(restorePendingAuthContext(adapter, restored), {
        action: 'save-share',
        route: 'share',
        visibility: 'public',
        albumId: 'album-1',
        pendingRoute: null
    });
    assert.equal(getPendingAuthAction(restored), 'save-share');
    assert.equal(adapter.getItem('ikkyee.pendingAuth'), null);
});

test('pending auth context preserves an upload route after OAuth redirect', () => {
    const state = { ...createPendingAuthState(), pendingAuthRoute: 'upload' };
    const storage = new Map();
    const adapter = {
        getItem: (key) => storage.get(key) || null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key)
    };

    storePendingAuthContext(adapter, state, { route: 'myphoto' });

    const restored = createPendingAuthState();
    assert.deepEqual(restorePendingAuthContext(adapter, restored), {
        action: null,
        route: 'myphoto',
        visibility: null,
        albumId: null,
        pendingRoute: 'upload'
    });
    assert.equal(restored.pendingAuthRoute, 'upload');
});
