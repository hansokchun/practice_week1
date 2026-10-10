import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
    getKakaoSharePayload,
    initializeKakaoShare,
    loadKakaoShareSdk,
    sendKakaoShare
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

test('photo and album share actions offer Kakao and link-copy fallback', () => {
    const source = readFileSync('js/app.js', 'utf8');

    const handler = source.slice(source.indexOf('function shareContentToKakao()'), source.indexOf('async function copyContentShareLink'));
    assert.match(handler, /sendKakaoShare\(window\.Kakao/);
    assert.doesNotMatch(handler, /await /);
    assert.match(source, /async function prepareContentShareKakao/);
    assert.match(source, /openContentShare\('album', getSelectedPublicAlbum\(\)\)/);
    assert.match(source, /openContentShare\('photo', photo\)/);
    assert.match(source, /addEventListener\('click', copyContentShareLink\)/);
});

test('Cloudflare allows the pinned Kakao SDK origin', () => {
    const headers = readFileSync('public/_headers', 'utf8');

    assert.match(headers, /script-src[^;]*https:\/\/t1\.kakaocdn\.net/);
    assert.match(headers, /connect-src[^;]*https:\/\/\*\.kakao\.com/);
    const formAction = headers.match(/form-action ([^;]+)/)[1];
    assert.equal(formAction, "'self' https://sharer.kakao.com https://accounts.kakao.com");
});

test('sharing invokes the SDK within the original click without an async boundary', () => {
    const calls = [];
    const kakao = { isInitialized: () => true, Share: { sendDefault: value => { calls.push(value); } } };
    assert.equal(sendKakaoShare(kakao, 'https://example.com/share/photo/1'), undefined);
    assert.equal(calls.length, 1);
});

test('SDK failure and timeout remove stale scripts so a later attempt can recover', async () => {
    let script;
    const documentObject = {
        getElementById: () => script,
        createElement: () => Object.assign(new EventTarget(), { remove() { script = undefined; } }),
        head: { append(value) { script = value; } }
    };
    const windowObject = {};
    const failed = loadKakaoShareSdk(documentObject, windowObject, 50);
    script.dispatchEvent(new Event('error'));
    await assert.rejects(failed);
    assert.equal(script, undefined);
    await assert.rejects(loadKakaoShareSdk(documentObject, windowObject, 5), /시간/);
    assert.equal(script, undefined);
    const success = loadKakaoShareSdk(documentObject, windowObject, 50);
    assert.equal(loadKakaoShareSdk(documentObject, windowObject, 50), success);
    windowObject.Kakao = { Share: {} };
    script.dispatchEvent(new Event('load'));
    assert.equal(await success, windowObject.Kakao);
});
