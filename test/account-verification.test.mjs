import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { isVerifiedAccount } from '../js/account-verification.mjs';

const appSource = readFileSync('js/app.js', 'utf8');

test('Kakao OAuth accounts are verified even when Kakao returns no email', () => {
    assert.equal(
        isVerifiedAccount({
            email: null,
            email_confirmed_at: null,
            app_metadata: { provider: 'kakao', providers: ['kakao'] }
        }),
        true
    );
});

test('Google OAuth and confirmed email accounts remain verified', () => {
    assert.equal(isVerifiedAccount({ app_metadata: { provider: 'google' } }), true);
    assert.equal(isVerifiedAccount({ email_confirmed_at: '2026-07-31T00:00:00Z' }), true);
});

test('unconfirmed email accounts remain blocked', () => {
    assert.equal(
        isVerifiedAccount({
            email: 'pending@example.com',
            email_confirmed_at: null,
            app_metadata: { provider: 'email' }
        }),
        false
    );
});

test('upload and publish verification uses the shared account helper', () => {
    assert.match(appSource, /import \{ isVerifiedAccount \} from '\.\/account-verification\.mjs';/);
    assert.match(appSource, /return isVerifiedAccount\(state\.currentUser\);/);
});
