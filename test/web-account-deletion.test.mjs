import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    ACCOUNT_DELETION_CONFIRMATION,
    getAccountDeletionControlState
} from '../js/account-deletion.mjs';

test('web account deletion requires the exact Korean confirmation while idle', () => {
    assert.equal(ACCOUNT_DELETION_CONFIRMATION, '계정 삭제');
    assert.deepEqual(getAccountDeletionControlState('', false), {
        confirmed: false,
        submitDisabled: true
    });
    assert.deepEqual(getAccountDeletionControlState('계정 삭제', false), {
        confirmed: true,
        submitDisabled: false
    });
    assert.deepEqual(getAccountDeletionControlState('계정 삭제', true), {
        confirmed: true,
        submitDisabled: true
    });
});

test('the web profile exposes a recoverable self-service deletion flow', () => {
    const html = readFileSync('index.html', 'utf8');
    const app = readFileSync('js/app.js', 'utf8');
    const auth = readFileSync('auth.js', 'utf8');

    assert.match(html, /id="account-deletion-section"[^>]*hidden/u);
    assert.match(html, /id="account-deletion-confirmation"/u);
    assert.match(html, /id="account-deletion-submit"/u);
    assert.match(html, /기기의 원본 사진은 유지/u);
    assert.match(app, /deleteCurrentAccount/u);
    assert.match(app, /getAccountDeletionControlState/u);
    assert.match(auth, /functions\.invoke\(['"]delete-account['"]/u);
    assert.match(auth, /confirmation:\s*['"]DELETE_ACCOUNT['"]/u);
    assert.match(auth, /signOut\(\{\s*scope:\s*['"]local['"]\s*\}\)/u);
    assert.match(auth, /signOut\([^;]+\.catch\(\(\)\s*=>\s*undefined\)/u);
});
