import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    getEmbeddedOAuthBrowserMessage,
    isLikelyEmbeddedOAuthBrowser
} from '../js/mobile-oauth-browser.mjs';

test('embedded mobile app browsers are treated as unsafe for social OAuth redirects', () => {
    assert.equal(isLikelyEmbeddedOAuthBrowser('Mozilla/5.0 KAKAOTALK 10.0.0'), true);
    assert.equal(isLikelyEmbeddedOAuthBrowser('Mozilla/5.0 Instagram 312.0.0 Android'), true);
    assert.equal(isLikelyEmbeddedOAuthBrowser('Mozilla/5.0 FBAN/FBIOS FBAV/450.0'), true);
    assert.equal(isLikelyEmbeddedOAuthBrowser('Mozilla/5.0 Linux; Android 13; wv) AppleWebKit/537.36'), true);
    assert.equal(isLikelyEmbeddedOAuthBrowser('Mozilla/5.0 NAVER(inapp; search; 2000; 12.0.0)'), true);
});

test('normal mobile browsers remain allowed for Google OAuth redirects', () => {
    assert.equal(isLikelyEmbeddedOAuthBrowser('Mozilla/5.0 iPhone AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1'), false);
    assert.equal(isLikelyEmbeddedOAuthBrowser('Mozilla/5.0 Linux; Android 14 AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36'), false);
    assert.equal(isLikelyEmbeddedOAuthBrowser('Mozilla/5.0 iPhone AppleWebKit/605.1.15 CriOS/126.0 Mobile/15E148 Safari/604.1'), false);
});

test('embedded OAuth browser message tells the user to switch to Safari or Chrome', () => {
    const googleMessage = getEmbeddedOAuthBrowserMessage('google');
    const kakaoMessage = getEmbeddedOAuthBrowserMessage('kakao');

    assert.match(googleMessage, /Google 로그인/);
    assert.match(googleMessage, /Safari 또는 Chrome/);
    assert.match(kakaoMessage, /Kakao 로그인/);
    assert.match(kakaoMessage, /Safari 또는 Chrome/);
});
