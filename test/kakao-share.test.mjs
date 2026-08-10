import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
    getKakaoSharePayload,
    initializeKakaoShare
} from '../js/kakao-share.mjs';

test('Kakao share payload keeps the public album URL on web and mobile links', () => {
    const url = 'https://dev.practice-week1-cws.pages.dev/#/trip?album=album-1';
    const payload = getKakaoSharePayload(url);

    assert.equal(payload.objectType, 'feed');
    assert.equal(payload.content.link.webUrl, url);
    assert.equal(payload.content.link.mobileWebUrl, url);
    assert.equal(payload.buttons[0].link.webUrl, url);
    assert.match(payload.content.imageUrl, /^https:\/\//);
});

test('Kakao share initializes once with the public JavaScript key', () => {
    const calls = [];
    const kakao = {
        isInitialized: () => calls.length > 0,
        init: (key) => calls.push(key)
    };

    initializeKakaoShare(kakao, 'browser-key');
    initializeKakaoShare(kakao, 'browser-key');

    assert.deepEqual(calls, ['browser-key']);
});

test('trip share actions open Kakao share and preserve link-copy fallback', () => {
    const source = readFileSync('js/app.js', 'utf8');

    assert.match(source, /async function shareCurrentTripWithKakao/);
    assert.match(source, /await sendKakaoShare/);
    assert.match(source, /await copyCurrentShareLink\(\)/);
    assert.match(source, /shareCurrentTripWithKakao\(\)/);
});

test('Cloudflare allows the pinned Kakao SDK origin', () => {
    const headers = readFileSync('public/_headers', 'utf8');

    assert.match(headers, /script-src[^;]*https:\/\/t1\.kakaocdn\.net/);
    assert.match(headers, /connect-src[^;]*https:\/\/\*\.kakao\.com/);
});
