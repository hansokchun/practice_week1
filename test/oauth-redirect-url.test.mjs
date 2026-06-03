import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getOAuthRedirectUrl } from '../js/oauth-redirect-url.mjs';

test('OAuth redirect keeps the current Cloudflare preview origin', () => {
    assert.equal(
        getOAuthRedirectUrl({
            origin: 'https://4084bcb2.practice-week1-cws.pages.dev',
            hostname: '4084bcb2.practice-week1-cws.pages.dev'
        }),
        'https://4084bcb2.practice-week1-cws.pages.dev/'
    );
});

test('OAuth redirect keeps the stable Cloudflare Pages origin', () => {
    assert.equal(
        getOAuthRedirectUrl({
            origin: 'https://practice-week1-cws.pages.dev',
            hostname: 'practice-week1-cws.pages.dev'
        }),
        'https://practice-week1-cws.pages.dev/'
    );
});

test('OAuth redirect avoids localhost callback after social login', () => {
    assert.equal(
        getOAuthRedirectUrl({ origin: 'http://localhost:5173', hostname: 'localhost' }),
        'https://practice-week1-cws.pages.dev/'
    );
    assert.equal(
        getOAuthRedirectUrl({ origin: 'http://127.0.0.1:5173', hostname: '127.0.0.1' }),
        'https://practice-week1-cws.pages.dev/'
    );
});
