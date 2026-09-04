import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
    createPendingAuthState,
    getPendingAuthAction,
    restorePendingAuthContext,
    setPendingAuthReturnRoute,
    setPendingAuthAction,
    storePendingAuthContext,
    takePendingAuthReturnRoute,
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

test('login return route preserves the page where the auth modal opened', () => {
    const state = createPendingAuthState();

    assert.equal(setPendingAuthReturnRoute(state, 'home'), 'home');
    assert.equal(takePendingAuthReturnRoute(state), 'home');
    assert.equal(takePendingAuthReturnRoute(state), null);
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
    storePendingAuthContext(adapter, state, { route: 'share', visibility: 'public', albumId: 'album-1' }, 1_000);

    const restored = createPendingAuthState();
    assert.deepEqual(restorePendingAuthContext(adapter, restored, 2_000), {
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

test('OAuth login preserves the current public route without a pending action', () => {
    const state = createPendingAuthState();
    const storage = new Map();
    const adapter = {
        getItem: (key) => storage.get(key) || null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key)
    };

    storePendingAuthContext(adapter, state, { route: 'explore' });

    const restored = createPendingAuthState();
    assert.deepEqual(restorePendingAuthContext(adapter, restored), {
        action: null,
        route: 'explore',
        visibility: null,
        albumId: null,
        pendingRoute: null
    });
    assert.equal(restored.pendingAuthReturnRoute, 'explore');
});

test('stale OAuth context is discarded after the mobile handoff window', () => {
    const state = createPendingAuthState();
    const storage = new Map();
    const adapter = {
        getItem: (key) => storage.get(key) || null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key)
    };

    storePendingAuthContext(adapter, state, { route: 'explore' }, 1_000);

    const restored = createPendingAuthState();
    assert.equal(restorePendingAuthContext(adapter, restored, 16 * 60 * 1000 + 1_000), null);
    assert.equal(adapter.getItem('ikkyee.pendingAuth'), null);
});

test('app stores pending OAuth navigation in local storage for cross-tab returns', () => {
    const app = readFileSync('js/app.js', 'utf8');
    assert.match(app, /storePendingAuthContext\(window\.localStorage/);
    assert.match(app, /restorePendingAuthContext\(window\.localStorage/);
});
