import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNativeApiFetch } from '../js/native-api-fetch.mjs';

const native = { isNativePlatform: () => true };

test('web API calls retain same-origin fetch and all supplied options', async () => {
    const calls = [];
    const options = { method: 'POST', body: '{}', cache: 'no-store' };
    const fetchApi = createNativeApiFetch({ capacitor: null, fetchImpl: async (...args) => { calls.push(args); return 'web'; } });
    assert.equal(await fetchApi('/api/analyze-photo', options), 'web');
    assert.deepEqual(calls, [['/api/analyze-photo', options]]);
});

test('native API requests use the approved HTTPS backend and retain authorization without URL leakage', async () => {
    const calls = [];
    const fetchApi = createNativeApiFetch({
        capacitor: native,
        nativeRequest: async (options) => { calls.push(options); return { status: 200, data: { ok: true }, headers: { 'Content-Type': 'application/json' } }; }
    });
    const result = await fetchApi('/api/analyze-photo', {
        method: 'POST', headers: { Authorization: 'Bearer test-session', 'Content-Type': 'application/json' }, body: '{"photoId":"photo-a"}'
    });
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { ok: true });
    assert.equal(calls[0].url, 'https://ikkyee.com/api/analyze-photo');
    assert.equal(calls[0].headers.Authorization, 'Bearer test-session');
    assert.equal(calls[0].disableRedirects, true);
    assert.equal(Object.keys(calls[0].headers).filter(key => key.toLowerCase() === 'authorization').length, 1);
    assert.deepEqual(calls[0].data, { photoId: 'photo-a' });
});

test('native HTTP redirects are rejected instead of following credentials to another host', async () => {
    const fetchApi = createNativeApiFetch({
        capacitor: native,
        nativeRequest: async () => ({ status: 302, data: '', headers: { Location: 'https://outside.example/api' } })
    });
    await assert.rejects(fetchApi('/api/config'), { message: '서버에 연결하지 못했어요. 다시 시도해 주세요.' });
});

test('API bridge rejects non-API destinations and aborts before credentials are sent', async () => {
    let called = false;
    const fetchApi = createNativeApiFetch({ capacitor: native, nativeRequest: async () => { called = true; } });
    await assert.rejects(fetchApi('https://evil.example/api/config'));
    await assert.rejects(fetchApi('/api/../account'));
    const controller = new AbortController(); controller.abort();
    await assert.rejects(fetchApi('/api/config', { signal: controller.signal }), { name: 'AbortError' });
    assert.equal(called, false);
});

test('native provider exceptions become safe retryable errors and keep non-2xx status responses', async () => {
    const fail = createNativeApiFetch({ capacitor: native, nativeRequest: async () => { throw new Error('private network credentials'); } });
    await assert.rejects(fail('/api/config'), { message: '서버에 연결하지 못했어요. 다시 시도해 주세요.' });
    const denied = createNativeApiFetch({ capacitor: native, nativeRequest: async () => ({ status: 401, data: { error: 'unauthorized' }, headers: {} }) });
    const response = await denied('/api/analyze-photo', { method: 'POST' });
    assert.equal(response.ok, false);
    assert.equal(response.status, 401);
});
