import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import config from '../vite.config.mjs';
import * as web from '../js/web-native-adapters.mjs';

test('browser builds replace app-only bridges so native SDKs are not shipped to the website', () => {
    const browser = config({ mode: 'production' });
    const native = config({ mode: 'native' });
    assert.equal(browser.resolve.alias.length, 6);
    assert.equal(native.resolve.alias.length, 0);
    for (const entry of browser.resolve.alias) {
        assert.match(entry.replacement, /web-native-adapters\.mjs$/);
    }
    assert.equal(browser.resolve.alias.some(entry => entry.find.test('./js/native-api-fetch.mjs')), true);
    assert.equal(browser.resolve.alias.some(entry => entry.find.test('./native-api-fetch.mjs')), true);
    const source = readFileSync('js/web-native-adapters.mjs', 'utf8');
    assert.doesNotMatch(source, /import\(/);
    assert.equal(web.isNativeApp(), false);
});

test('browser adapter keeps fetch exact and native content actions unhandled', async () => {
    const previous = globalThis.fetch;
    const input = '/api/config';
    const options = { cache: 'no-store' };
    globalThis.fetch = (...args) => args;
    try {
        assert.deepEqual(web.fetchApi(input, options), [input, options]);
        assert.deepEqual(await web.shareNativeContent({}), { handled: false, data: null, error: null });
        assert.deepEqual(await web.saveNativePhoto({}), { handled: false, data: null, error: null });
        assert.equal((await web.bindNativeAppRuntime()).native, false);
        assert.throws(() => web.createNativeAuthStorage(), /앱에서만/);
    } finally {
        globalThis.fetch = previous;
    }
});
