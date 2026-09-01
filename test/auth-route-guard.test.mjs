import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    getAuthRequiredRoute,
    takePendingAuthRoute
} from '../js/auth-route-guard.mjs';

test('upload route requires login before rendering', () => {
    assert.equal(getAuthRequiredRoute('upload', null), 'upload');
    assert.equal(getAuthRequiredRoute('upload', { id: 'user-1' }), null);
    assert.equal(getAuthRequiredRoute('settings', null), 'settings');
    assert.equal(getAuthRequiredRoute('settings', { id: 'user-1' }), null);
    assert.equal(getAuthRequiredRoute('upload-complete', null), 'upload-complete');
    assert.equal(getAuthRequiredRoute('location-assign', null), 'location-assign');
});

test('public routes do not require login', () => {
    assert.equal(getAuthRequiredRoute('home', null), null);
    assert.equal(getAuthRequiredRoute('myphoto', null), null);
    assert.equal(getAuthRequiredRoute('explore', null), null);
});

test('pending auth route is returned and cleared once after login', () => {
    const state = { pendingAuthRoute: 'upload' };

    assert.equal(takePendingAuthRoute(state), 'upload');
    assert.equal(takePendingAuthRoute(state), null);
});
