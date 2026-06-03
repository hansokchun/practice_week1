import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getOAuthRedirectUrl } from '../js/oauth-redirect-url.mjs';

test('OAuth redirect sends Cloudflare deployment previews back to the dev branch alias', () => {
    assert.equal(
        getOAuthRedirectUrl({
            origin: 'https://4084bcb2.practice-week1-cws.pages.dev',
            hostname: '4084bcb2.practice-week1-cws.pages.dev'
        }),
        'https://dev.practice-week1-cws.pages.dev/'
    );
});

test('OAuth redirect keeps the dev branch alias', () => {
    assert.equal(
        getOAuthRedirectUrl({
            origin: 'https://dev.practice-week1-cws.pages.dev',
            hostname: 'dev.practice-week1-cws.pages.dev'
        }),
        'https://dev.practice-week1-cws.pages.dev/'
    );
});

test('OAuth redirect keeps the production Cloudflare Pages origin', () => {
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
        'https://dev.practice-week1-cws.pages.dev/'
    );
    assert.equal(
        getOAuthRedirectUrl({ origin: 'http://127.0.0.1:5173', hostname: '127.0.0.1' }),
        'https://dev.practice-week1-cws.pages.dev/'
    );
});
