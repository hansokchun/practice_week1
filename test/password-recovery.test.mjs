import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isPasswordRecoveryCallback } from '../js/password-recovery.mjs';

test('password recovery callback detects Supabase implicit-flow hashes', () => {
    assert.equal(isPasswordRecoveryCallback('#access_token=token&type=recovery'), true);
    assert.equal(isPasswordRecoveryCallback('#type=recovery&access_token=token'), true);
});

test('normal routes and OAuth callbacks are not password recovery callbacks', () => {
    assert.equal(isPasswordRecoveryCallback('#/'), false);
    assert.equal(isPasswordRecoveryCallback('#access_token=token&type=signup'), false);
    assert.equal(isPasswordRecoveryCallback(''), false);
});
