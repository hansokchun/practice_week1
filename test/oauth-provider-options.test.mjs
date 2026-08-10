import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { getOAuthProviderOptions } from '../js/oauth-provider-options.mjs';

test('Kakao OAuth uses the account login screen on mobile to avoid losing the callback', () => {
    const options = getOAuthProviderOptions('kakao', {
        origin: 'https://dev.practice-week1-cws.pages.dev',
        hostname: 'dev.practice-week1-cws.pages.dev'
    }, 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1');

    assert.deepEqual(options, {
        redirectTo: 'https://dev.practice-week1-cws.pages.dev/',
        queryParams: {
            prompt: 'login'
        }
    });
});

test('Kakao OAuth keeps the default account chooser on desktop', () => {
    const options = getOAuthProviderOptions('kakao', {
        origin: 'https://dev.practice-week1-cws.pages.dev',
        hostname: 'dev.practice-week1-cws.pages.dev'
    }, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15');

    assert.deepEqual(options, {
        redirectTo: 'https://dev.practice-week1-cws.pages.dev/'
    });
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

test('auth modal exposes Google, Kakao, and email start choices', () => {
    const html = readFileSync('index.html', 'utf8');

    assert.match(html, /id="btn-google-login"/);
    assert.match(html, /id="btn-kakao-login"/);
    assert.match(html, /id="btn-email-start"/);
    assert.match(html, /id="btn-signup"/);
    assert.match(html, /id="btn-switch-login"/);
    assert.match(html, /id="auth-form" class="auth-form" hidden/);
    assert.doesNotMatch(html, /auth-divider/);
});

test('social login warns before redirecting from embedded mobile browsers', () => {
    const source = readFileSync('js/app.js', 'utf8');
    const start = source.indexOf('async function handleSocialLogin');
    const end = source.indexOf('async function runPendingAuthAction', start);
    const body = source.slice(start, end);

    assert.match(body, /isLikelyEmbeddedOAuthBrowser\(window\.navigator\?\.userAgent\)/);
    assert.match(body, /getEmbeddedOAuthBrowserMessage\(provider\)/);
    assert.match(body, /showToast\(browserMessage\)/);
    assert.match(body, /return;/);
});
