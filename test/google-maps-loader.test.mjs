import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGoogleMapsLoader } from '../js/google-maps-loader.mjs';

function harness(loadConfig = async () => ({ apiKey: 'test-key' })) {
    const scripts = [], timers = new Map(), stages = [];
    const window = {};
    let id = 0;
    const load = createGoogleMapsLoader({ window, loadConfig,
        document: { createElement: () => ({ remove() { this.removed = true; } }),
            head: { appendChild: script => scripts.push(script) } },
        setTimer: fn => { timers.set(++id, fn); return id; }, clearTimer: id => timers.delete(id),
        onStatus: code => stages.push(code)
    });
    const flush = () => new Promise(resolve => setImmediate(resolve));
    const ready = script => {
        window.google = { maps: { Map: function Map() {} } };
        window[new URL(script.src).searchParams.get('callback')]();
    };
    return { load, window, scripts, timers, stages, flush, ready };
}

test('map requests share one script and resolve only after the SDK callback', async () => {
    const h = harness();
    const first = h.load(), second = h.load();
    assert.equal(first, second);
    await h.flush();
    assert.equal(h.scripts.length, 1);
    assert.equal(new URL(h.scripts[0].src).origin, 'https://maps.googleapis.com');
    assert.equal(new URL(h.scripts[0].src).searchParams.get('loading'), 'async');
    assert.equal(new URL(h.scripts[0].src).searchParams.get('libraries'), 'places,marker');
    h.ready(h.scripts[0]);
    assert.equal(await first, h.window.google.maps);
    assert.equal(h.timers.size, 0);
    assert.equal(await h.load(), h.window.google.maps);
});

test('script errors remove the failed attempt and allow a new load', async () => {
    const h = harness();
    const first = h.load();
    const rejection = assert.rejects(first, { code: 'MAP_SCRIPT_ERROR' });
    await h.flush(); h.scripts[0].onerror(); await rejection;
    assert.equal(h.scripts[0].removed, true);
    const second = h.load(); await h.flush();
    assert.equal(h.scripts.length, 2);
    h.ready(h.scripts[1]); await second;
});

test('timeout also bounds config requests and ignores late responses', async () => {
    let finish;
    const h = harness(() => new Promise(resolve => { finish = resolve; }));
    const pending = h.load();
    const rejection = assert.rejects(pending, { code: 'MAP_TIMEOUT' });
    await h.flush(); [...h.timers.values()][0](); await rejection;
    finish({ apiKey: 'test-key' }); await h.flush();
    assert.equal(h.scripts.length, 0);
});

test('missing config is retryable and errors never expose key or provider details', async () => {
    let available = false;
    const h = harness(async () => available ? { apiKey: 'test-key' } : {});
    await assert.rejects(h.load(), { code: 'MAP_CONFIG_ERROR' });
    available = true;
    const retry = h.load(); await h.flush(); h.ready(h.scripts[0]); await retry;
    const broken = harness(async () => { throw new Error('private-provider-detail'); });
    await assert.rejects(broken.load(), error => {
        assert.equal(error.code, 'MAP_CONFIG_ERROR');
        assert.equal(error.message.includes('private-provider-detail'), false);
        assert.equal('cause' in error, false);
        return true;
    });
});

test('a missing SDK callback times out and stale callbacks cannot settle a retry', async () => {
    const h = harness();
    const first = h.load(); await h.flush();
    const oldCallback = h.window[new URL(h.scripts[0].src).searchParams.get('callback')];
    const rejection = assert.rejects(first, { code: 'MAP_TIMEOUT' });
    [...h.timers.values()][0](); await rejection;
    assert.equal(h.scripts[0].removed, true);
    const retry = h.load(); await h.flush();
    oldCallback();
    assert.equal(h.timers.size, 1);
    h.ready(h.scripts[1]); await retry;
    assert.equal(h.timers.size, 0);
});

test('Google auth failure is handled before and after the SDK callback without pretending success', async () => {
    for (const afterReady of [false, true]) {
        const h = harness();
        const pending = h.load(); await h.flush();
        if (afterReady) { h.ready(h.scripts[0]); await pending; }
        const rejection = afterReady ? null : assert.rejects(pending, { code: 'MAP_AUTH_ERROR' });
        h.window.gm_authFailure();
        if (rejection) await rejection;
        assert.ok(h.stages.includes('MAP_AUTH_ERROR'));
        await assert.rejects(h.load(), { code: 'MAP_AUTH_ERROR' });
    }
});
