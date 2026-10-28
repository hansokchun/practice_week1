import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as pendingAuth from '../js/pending-auth-action.mjs';

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
    assert.equal(setPendingAuthAction(state, 'save-photo-trial'), 'save-photo-trial');
    assert.equal(getPendingAuthAction(state), 'save-photo-trial');
    assert.equal(setPendingAuthAction(state, 'persist-photo-trial'), 'persist-photo-trial');
    assert.equal(getPendingAuthAction(state), 'persist-photo-trial');
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

test('photo trial save intent survives OAuth without storing photo bytes in auth context', () => {
    const storage = new Map();
    const adapter = {
        getItem: key => storage.get(key) || null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: key => storage.delete(key)
    };
    const state = createPendingAuthState();
    setPendingAuthAction(state, 'save-photo-trial');
    storePendingAuthContext(adapter, state, { route: 'home', visibility: 'private' }, 1_000);
    const restored = createPendingAuthState();
    assert.equal(restorePendingAuthContext(adapter, restored, 2_000)?.action, 'save-photo-trial');
    assert.equal(getPendingAuthAction(restored), 'save-photo-trial');
    assert.doesNotMatch(JSON.stringify([...storage.values()]), /blob:|data:image|base64/);
});

function createMemoryStorage() {
    const values = new Map();
    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: key => values.delete(key)
    };
}

test('trial upload intent stores at most three unique photo IDs without photo or location data', () => {
    const storage = createMemoryStorage();
    const state = { ...createPendingAuthState(), pendingPhotoTrialIds: ['state-photo'] };
    setPendingAuthAction(state, 'persist-photo-trial');

    const payload = storePendingAuthContext(storage, state, {
        route: 'upload',
        trialIds: ['photo-1', 'photo-2', 'photo-1', null, {}, 'data:image/jpeg;base64,x', 'photo-3', 'photo-4', 'x'.repeat(129)],
        file: 'private-photo-bytes',
        lat: 37.5,
        lng: 127.1
    }, 1_000);

    assert.deepEqual(payload.trialIds, ['photo-1', 'photo-2', 'photo-3']);
    const serialized = storage.getItem('ikkyee.pendingAuth');
    assert.doesNotMatch(serialized, /private-photo-bytes|data:image|base64|"lat"|"lng"/);
    const restored = createPendingAuthState();
    const context = restorePendingAuthContext(storage, restored, 2_000);
    assert.equal(context.action, 'persist-photo-trial');
    assert.deepEqual(context.trialIds, ['photo-1', 'photo-2', 'photo-3']);
    assert.deepEqual(restored.pendingPhotoTrialIds, context.trialIds);
    assert.equal(storage.getItem('ikkyee.pendingAuth'), null);
});

test('trial upload IDs fall back to state across social-login context rewrites', () => {
    const storage = createMemoryStorage();
    const state = { ...createPendingAuthState(), pendingPhotoTrialIds: ['photo-2'] };
    setPendingAuthAction(state, 'persist-photo-trial');

    storePendingAuthContext(storage, state, { route: 'upload' }, 1_000);

    assert.deepEqual(JSON.parse(storage.getItem('ikkyee.pendingAuth')).trialIds, ['photo-2']);
});

test('only trial-upload actions persist photo IDs and can survive the email-confirmation window', () => {
    const storage = createMemoryStorage();
    const state = { ...createPendingAuthState(), pendingPhotoTrialIds: ['photo-1'] };
    setPendingAuthAction(state, 'persist-photo-trial');
    storePendingAuthContext(storage, state, { route: 'upload' }, 1_000);

    const restored = createPendingAuthState();
    assert.equal(restorePendingAuthContext(storage, restored, 1_000 + 23 * 60 * 60 * 1000)?.action, 'persist-photo-trial');
    assert.deepEqual(restored.pendingPhotoTrialIds, ['photo-1']);

    setPendingAuthAction(state, 'persist-upload');
    storePendingAuthContext(storage, state, { route: 'upload', trialIds: ['photo-1'] }, 1_000);
    assert.equal(Object.hasOwn(JSON.parse(storage.getItem('ikkyee.pendingAuth')), 'trialIds'), false);
    assert.equal(restorePendingAuthContext(storage, createPendingAuthState(), 1_000 + 16 * 60 * 1000), null);
});

test('guest refresh retains valid trial intent until an authenticated return consumes it', () => {
    const storage = createMemoryStorage();
    const state = { ...createPendingAuthState(), pendingPhotoTrialIds: ['photo-1'] };
    setPendingAuthAction(state, 'persist-photo-trial');
    storePendingAuthContext(storage, state, { route: 'upload' }, 1_000);
    const original = storage.getItem('ikkyee.pendingAuth');

    const guestState = createPendingAuthState();
    assert.equal(restorePendingAuthContext(storage, guestState, 2_000, { consume: false })?.action, 'persist-photo-trial');
    assert.equal(storage.getItem('ikkyee.pendingAuth'), original);
    assert.deepEqual(guestState.pendingPhotoTrialIds, ['photo-1']);

    const memberState = createPendingAuthState();
    assert.equal(restorePendingAuthContext(storage, memberState, 3_000)?.action, 'persist-photo-trial');
    assert.equal(storage.getItem('ikkyee.pendingAuth'), null);
});

test('expired and malformed auth intents are removed even when consumption is deferred', () => {
    const storage = createMemoryStorage();
    const state = { ...createPendingAuthState(), pendingPhotoTrialIds: ['photo-1'] };
    setPendingAuthAction(state, 'persist-photo-trial');
    storePendingAuthContext(storage, state, { route: 'upload' }, 1_000);

    assert.equal(restorePendingAuthContext(storage, createPendingAuthState(), 1_001 + 24 * 60 * 60 * 1000, { consume: false }), null);
    assert.equal(storage.getItem('ikkyee.pendingAuth'), null);
    storage.setItem('ikkyee.pendingAuth', '{broken');
    assert.equal(restorePendingAuthContext(storage, createPendingAuthState(), 2_000, { consume: false }), null);
    assert.equal(storage.getItem('ikkyee.pendingAuth'), null);
    storage.setItem('ikkyee.pendingAuth', JSON.stringify({ action: 'unsupported', createdAt: 1_000 }));
    assert.equal(restorePendingAuthContext(storage, createPendingAuthState(), 2_000, { consume: false }), null);
    assert.equal(storage.getItem('ikkyee.pendingAuth'), null);
});

test('explicit auth-context cancellation clears storage without touching other browser data', () => {
    const storage = createMemoryStorage();
    storage.setItem('ikkyee.pendingAuth', 'pending');
    storage.setItem('unrelated-setting', 'keep');

    pendingAuth.clearPendingAuthContext(storage);

    assert.equal(storage.getItem('ikkyee.pendingAuth'), null);
    assert.equal(storage.getItem('unrelated-setting'), 'keep');
    assert.doesNotThrow(() => pendingAuth.clearPendingAuthContext(null));
});
