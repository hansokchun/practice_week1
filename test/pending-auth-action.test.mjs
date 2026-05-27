import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createPendingAuthState,
    getPendingAuthAction,
    setPendingAuthAction,
    takePendingAuthAction
} from '../js/pending-auth-action.mjs';

test('pending auth actions accept only supported follow-up actions', () => {
    const state = createPendingAuthState();

    assert.equal(setPendingAuthAction(state, 'persist-upload'), 'persist-upload');
    assert.equal(getPendingAuthAction(state), 'persist-upload');
    assert.equal(setPendingAuthAction(state, 'unknown'), null);
    assert.equal(getPendingAuthAction(state), null);
});

test('takePendingAuthAction returns and clears the saved action', () => {
    const state = createPendingAuthState();

    setPendingAuthAction(state, 'save-share');

    assert.equal(takePendingAuthAction(state), 'save-share');
    assert.equal(takePendingAuthAction(state), null);
});
