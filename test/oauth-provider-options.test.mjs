import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('auth modal exposes Google and email auth while Kakao is disabled for QA', () => {
    const html = readFileSync('index.html', 'utf8');

    assert.match(html, /id="btn-google-login"/);
    assert.match(html, /id="auth-form"/);
    assert.doesNotMatch(html, /id="btn-kakao-login"/);
});

test('Google login warns before redirecting from embedded mobile browsers', () => {
    const source = readFileSync('js/app.js', 'utf8');
    const start = source.indexOf('async function handleSocialLogin');
    const end = source.indexOf('async function runPendingAuthAction', start);
    const body = source.slice(start, end);

    assert.match(body, /provider === 'google' && isLikelyEmbeddedOAuthBrowser\(window\.navigator\?\.userAgent\)/);
    assert.match(body, /getEmbeddedOAuthBrowserMessage\(provider\)/);
    assert.match(body, /showToast\(browserMessage\)/);
    assert.match(body, /return;/);
});
