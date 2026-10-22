import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { createNativeStartupPlugin } from '../scripts/native-startup.mjs';
import { normalizeNativeRoute } from '../js/native-startup-route.mjs';
import { getAuthRequiredRoute } from '../js/auth-route-guard.mjs';
import { onDocumentReady } from '../js/document-ready.mjs';

test('app bootstrap also runs when the native WebView finishes DOM loading before its module', () => {
    for (const readyState of ['complete']) {
        let starts = 0;
        onDocumentReady({ readyState, addEventListener() { assert.fail('event has already fired'); } }, () => starts++);
        assert.equal(starts, 1);
    }
    let listener, options;
    let starts = 0;
    onDocumentReady({ readyState: 'interactive', addEventListener(name, fn, opts) {
        assert.equal(name, 'DOMContentLoaded'); listener = fn; options = opts;
    } }, () => starts++);
    assert.equal(starts, 0);
    assert.equal(options.once, true);
    listener();
    assert.equal(starts, 1);
});

test('interactive handlers are bound before native plugin or session restoration waits', () => {
    const app = readFileSync('js/app.js', 'utf8');
    const bootstrap = app.slice(app.indexOf('onDocumentReady(document,'));
    assert.ok(bootstrap.indexOf('bindEvents();') >= 0);
    assert.ok(bootstrap.indexOf('bindEvents();') < bootstrap.indexOf('await bindNativeAppRuntime'));
    assert.equal(bootstrap.match(/bindEvents\(\);/g).length, 1);
    assert.match(app, /btn-native-guest/);
});

test('native entry and old landing links resolve to main without altering public deep links or website', () => {
    for (const route of ['', 'landing']) assert.equal(normalizeNativeRoute(route, true), 'home');
    for (const route of ['home', 'explore', 'trip', 'profile', 'tag', 'upload', 'admin-landing']) {
        assert.equal(normalizeNativeRoute(route, true), route);
    }
    assert.equal(normalizeNativeRoute('landing', false), 'landing');
});

test('guests can browse photos, maps, albums and public profiles but cannot enter account write flows', () => {
    for (const route of ['home', 'explore', 'trip', 'tag', 'profile']) assert.equal(getAuthRequiredRoute(route, null), null);
    for (const route of ['upload', 'settings', 'location-assign']) assert.equal(getAuthRequiredRoute(route, null), route);
});

test('native-only build removes the landing screen and starts with accessible local brand animation', () => {
    const input = readFileSync('index.html', 'utf8');
    const plugin = createNativeStartupPlugin();
    const result = plugin.transformIndexHtml.handler(input);
    assert.doesNotMatch(result.html, /id="page-landing"/);
    assert.doesNotMatch(result.html, /data-landing-only|Gowun\+Batang/);
    assert.match(result.html, /family=Cormorant\+Garamond/, 'shared brand font is preserved');
    assert.match(result.html, /data-page="home"/);
    assert.match(result.html, /id="page-home" class="page page-home active"/);
    assert.match(result.html, /class="brand" href="#\/" data-route="home"/);
    assert.match(result.html, /id="native-startup"[^>]*role="status"/);
    assert.match(result.html, /images\/logo.png/);
    assert.match(result.html, /로그인 없이 사진과 장소를 둘러보세요/);
    assert.match(result.html, /id="btn-native-guest"/);
    assert.doesNotMatch(result.html, /cdn\.jsdelivr\.net\/npm\/@supabase/);
    assert.match(result.html, /src="\.\/native-supabase.js"/);
    assert.ok(result.tags.some(tag => tag.attrs?.src === './native-startup.js'));
    assert.match(input, /id="page-landing"/, 'website source remains unchanged');
});

test('the emitted native auth SDK is pinned to the same version as the website and included locally', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const version = pkg.dependencies['@supabase/supabase-js'];
    assert.match(version, /^\d+\.\d+\.\d+$/);
    assert.ok(readFileSync('index.html', 'utf8').includes(`@supabase/supabase-js@${version}/`));
    const assets = [];
    createNativeStartupPlugin().generateBundle.call({ emitFile: asset => assets.push(asset) });
    assert.deepEqual(assets.map(asset => asset.fileName), ['native-startup.css', 'native-startup.js', 'native-supabase.js']);
    assert.ok(assets.every(asset => asset.type === 'asset' && asset.source.length > 0));
});

test('startup asset respects reduced motion and exposes recovery when boot never completes', () => {
    const css = readFileSync('app-shell/runtime/native-startup.css', 'utf8');
    assert.match(css, /prefers-reduced-motion: reduce/);
    assert.match(css, /env\(safe-area-inset-top/);
    assert.match(css, /@keyframes ikkyee-logo-arrive/);
    const script = readFileSync('app-shell/runtime/native-startup.js', 'utf8');
    let timeout, reloads = 0;
    const overlay = { hidden: false, dataset: {} };
    const recovery = { hidden: true };
    const retry = {};
    const message = {};
    const events = {};
    let booting = true;
    let observer;
    vm.runInNewContext(script, {
        document: { getElementById: id => ({ 'native-startup': overlay, 'native-startup-recovery': recovery,
            'native-startup-retry': retry, 'native-startup-message': message })[id],
            body: { classList: { contains: () => booting } } },
        window: { addEventListener: (name, callback) => { events[name] = callback; },
            location: { reload: () => reloads++ } },
        MutationObserver: class { constructor(fn) { observer = fn; } observe() {} disconnect() {} },
        setTimeout: fn => { timeout = fn; return 1; }, clearTimeout() {}
    });
    timeout();
    assert.equal(recovery.hidden, false);
    assert.equal(overlay.dataset.slow, 'true');
    retry.onclick();
    assert.equal(reloads, 1);
    booting = false;
    observer();
    assert.equal(overlay.hidden, true);
});

test('startup disappears when navigation is ready, including before its observer attaches', () => {
    const script = readFileSync('app-shell/runtime/native-startup.js', 'utf8');
    for (const readyInitially of [true, false]) {
        const overlay = { hidden: false, dataset: {} };
        const body = { dataset: { nativeUiReady: readyInitially ? 'true' : 'false' },
            classList: { contains: () => true } };
        let observe, cleared = 0;
        vm.runInNewContext(script, {
            document: { body, getElementById: id => id === 'native-startup' ? overlay : {} },
            window: { addEventListener() {}, location: {} },
            MutationObserver: class { constructor(fn) { observe = fn; } observe() {} disconnect() {} },
            setTimeout: () => 1, clearTimeout: () => cleared++
        });
        assert.equal(overlay.hidden, readyInitially);
        if (!readyInitially) { body.dataset.nativeUiReady = 'true'; observe(); }
        assert.equal(overlay.hidden, true);
        assert.equal(cleared, 1);
    }
    const app = readFileSync('js/app.js', 'utf8');
    const bootstrap = app.slice(app.indexOf('onDocumentReady(document,'));
    const ready = bootstrap.indexOf("document.body.dataset.nativeUiReady = 'true'");
    assert.ok(ready > bootstrap.indexOf('state.currentUser = await getCurrentUser()'));
    assert.ok(ready < bootstrap.indexOf('await Promise.all([loadSavedLibrary()'));
});
