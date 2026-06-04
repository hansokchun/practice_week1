import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getOAuthProviderOptions } from '../js/oauth-provider-options.mjs';

test('Kakao OAuth requests only configured profile scopes without email', () => {
    const options = getOAuthProviderOptions('kakao', {
        origin: 'https://dev.practice-week1-cws.pages.dev',
        hostname: 'dev.practice-week1-cws.pages.dev'
    });

    assert.equal(options.redirectTo, 'https://dev.practice-week1-cws.pages.dev/');
    assert.equal(options.scopes, 'profile_nickname profile_image');
    assert.equal(options.scopes.includes('account_email'), false);
});

test('Google OAuth keeps the default Supabase provider scopes', () => {
    const options = getOAuthProviderOptions('google', {
        origin: 'https://dev.practice-week1-cws.pages.dev',
        hostname: 'dev.practice-week1-cws.pages.dev'
    });

    assert.deepEqual(options, {
        redirectTo: 'https://dev.practice-week1-cws.pages.dev/'
    });
});
