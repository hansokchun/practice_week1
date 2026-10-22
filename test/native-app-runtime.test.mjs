import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    bindNativeAppRuntime,
    getNativeApiOrigin,
    isNativeApp,
    resolveNativeApiUrl
} from '../js/native-app-runtime.mjs';

const android = { isNativePlatform: () => true, getPlatform: () => 'android' };
const ios = { isNativePlatform: () => true, getPlatform: () => 'ios' };
const browser = { isNativePlatform: () => false, getPlatform: () => 'web' };

function createSurface(hash = '#/landing') {
    const events = new Map();
    const classNames = new Set();
    const attributes = new Map();
    const calls = { back: 0, exits: 0, removals: 0, pluginLoads: 0 };
    const window = {
        location: { hash },
        history: { length: 50, back: () => { calls.back += 1; } },
        addEventListener: (name, handler) => events.set(name, handler),
        removeEventListener: (name, handler) => {
            if (events.get(name) === handler) events.delete(name);
        },
        dispatchEvent: (event) => { events.get(event.type)?.(event); return true; },
        CustomEvent: class {
            constructor(type, options = {}) { this.type = type; Object.assign(this, options); }
        }
    };
    const document = {
        documentElement: {
            classList: {
                add: (...names) => names.forEach(name => classNames.add(name)),
                remove: (...names) => names.forEach(name => classNames.delete(name))
            },
            setAttribute: (name, value) => attributes.set(name, value),
            removeAttribute: name => attributes.delete(name)
        }
    };
    const pluginEvents = new Map();
    const appPlugin = {
        addListener: async (name, handler) => {
            pluginEvents.set(name, handler);
            return { remove: async () => { pluginEvents.delete(name); calls.removals += 1; } };
        },
        exitApp: async () => { calls.exits += 1; }
    };
    return { window, document, appPlugin, events, pluginEvents, classNames, attributes, calls };
}

test('native detection requires the Capacitor platform method, never a phone user agent', () => {
    assert.equal(isNativeApp(android), true);
    assert.equal(isNativeApp(browser), false);
    assert.equal(isNativeApp({ userAgent: 'Android iPhone', getPlatform: () => 'android' }), false);
    assert.equal(isNativeApp({ isNativePlatform: () => 'true' }), false);
    assert.equal(isNativeApp({ isNativePlatform() { throw new Error('bridge unavailable'); } }), false);
    assert.equal(isNativeApp(null), false);
});

test('native API origin is fixed and preview requires an explicit build environment', () => {
    assert.equal(getNativeApiOrigin(), 'https://ikkyee.com');
    assert.equal(getNativeApiOrigin('production'), 'https://ikkyee.com');
    assert.equal(getNativeApiOrigin('preview'), 'https://dev.practice-week1-cws.pages.dev');
    for (const environment of ['development', 'https://attacker.example', 'preview ']) {
        assert.throws(() => getNativeApiOrigin(environment), /environment/i);
    }
});

test('API resolver preserves web relative requests and promotes native requests to HTTPS', () => {
    assert.equal(resolveNativeApiUrl('/api/config', { capacitor: browser }), '/api/config');
    assert.equal(resolveNativeApiUrl('/api/config', { capacitor: android }), 'https://ikkyee.com/api/config');
    assert.equal(resolveNativeApiUrl('/api/photos/analysis?id=photo-1', { capacitor: ios, environment: 'preview' }),
        'https://dev.practice-week1-cws.pages.dev/api/photos/analysis?id=photo-1');
});

test('API resolver refuses external URLs, protocols, fragments and path traversal', () => {
    const unsafe = [
        'https://ikkyee.com/api/config', 'https://attacker.example/api/config',
        '//attacker.example/api/config', 'javascript:alert(1)', 'file:///api/config',
        'capacitor://localhost/api/config', '/config', '/api', '/api/config#token',
        '/api/../config', '/api/foo/../../config', '/api/%2e%2e/config',
        '/api/%2fconfig', '/api/%5cconfig', '/api/\\attacker.example',
        '/api/config\n', ' /api/config', '/api/%zz', null
    ];
    for (const path of unsafe) {
        assert.throws(() => resolveNativeApiUrl(path, { capacitor: android }), /API path/i, String(path));
    }
});

test('web bootstrap does not load native plugins or alter the document', async () => {
    const surface = createSurface();
    const runtime = await bindNativeAppRuntime({
        ...surface,
        capacitor: browser,
        loadAppPlugin: async () => { surface.calls.pluginLoads += 1; throw new Error('must not run'); }
    });
    assert.equal(runtime.native, false);
    assert.equal(surface.calls.pluginLoads, 0);
    assert.equal(surface.classNames.size, 0);
    assert.equal(surface.pluginEvents.size, 0);
    await runtime.dispose();
});

test('Android back closes the active modal before navigation or requesting exit', async () => {
    const surface = createSurface();
    let dismissals = 0;
    let exitRequests = 0;
    const runtime = await bindNativeAppRuntime({
        ...surface, capacitor: android,
        closeTopModal: () => { dismissals += 1; return true; },
        requestExit: () => { exitRequests += 1; return true; }
    });
    await runtime.handleBackButton({ canGoBack: true });
    assert.equal(dismissals, 1);
    assert.equal(surface.calls.back, 0);
    assert.equal(exitRequests, 0);
    assert.equal(surface.calls.exits, 0);
    assert.equal(surface.classNames.has('native-app'), true);
    assert.equal(surface.classNames.has('native-android'), true);
    assert.equal(surface.attributes.get('data-native-platform'), 'android');
    await runtime.dispose();
    assert.equal(surface.calls.removals, 1);
    assert.equal(surface.events.size, 0);
    assert.equal(surface.classNames.size, 0);
});

test('only hash navigation observed inside this app is eligible for history back', async () => {
    const surface = createSurface();
    const runtime = await bindNativeAppRuntime({ ...surface, capacitor: android });
    surface.window.location.hash = '#/upload';
    surface.events.get('hashchange')();
    await runtime.handleBackButton({ canGoBack: true });
    assert.equal(surface.calls.back, 1);
    surface.window.location.hash = '#/landing';
    surface.events.get('hashchange')();
    await runtime.handleBackButton({ canGoBack: true });
    assert.equal(surface.calls.back, 1, 'arbitrary native/browser history must not leave the bundled app');
    assert.equal(surface.calls.exits, 0, 'no automatic exit without user confirmation');
    await runtime.dispose();
});

test('a deep-linked route returns to the app root before an exit can be confirmed', async () => {
    const surface = createSurface('#/photo?id=photo-1');
    let exitRequests = 0;
    const runtime = await bindNativeAppRuntime({
        ...surface, capacitor: android,
        requestExit: () => { exitRequests += 1; return true; }
    });
    await runtime.handleBackButton();
    assert.equal(surface.window.location.hash, '#/');
    assert.equal(exitRequests, 0);
    assert.equal(surface.calls.exits, 0);
    surface.events.get('hashchange')();
    await runtime.handleBackButton();
    assert.equal(surface.calls.back, 0, 'return to root must not bounce back to the direct link');
    assert.equal(exitRequests, 1);
    assert.equal(surface.calls.exits, 1);
    await runtime.dispose();
});

test('back presses are held until hash traversal finishes and replacement routes stay inside the app', async () => {
    const surface = createSurface('');
    const runtime = await bindNativeAppRuntime({ ...surface, capacitor: android });
    // Initial routing can replaceState without firing hashchange.
    surface.window.location.hash = '#/landing';
    surface.window.location.hash = '#/upload';
    surface.events.get('hashchange')({ oldURL: 'https://localhost/#/landing' });
    await runtime.handleBackButton();
    await runtime.handleBackButton();
    assert.equal(surface.calls.back, 1, 'a second press must not traverse beyond the app while back is pending');
    surface.window.location.hash = '#/landing';
    surface.events.get('hashchange')({ oldURL: 'https://localhost/#/upload' });
    await runtime.handleBackButton();
    assert.equal(surface.calls.back, 1);
    await runtime.dispose();
});

test('a normal revisit of an earlier route is navigation rather than assumed history traversal', async () => {
    const surface = createSurface();
    const runtime = await bindNativeAppRuntime({ ...surface, capacitor: android });
    surface.window.location.hash = '#/upload';
    surface.events.get('hashchange')();
    surface.window.location.hash = '#/landing';
    surface.events.get('hashchange')();
    await runtime.handleBackButton();
    assert.equal(surface.calls.back, 1, 'back from a manual root revisit should return to upload');
    await runtime.dispose();
});

test('root exit requires an exact confirmed response and ignores repeated in-flight presses', async () => {
    const surface = createSurface();
    let resolveConfirmation;
    let exitRequests = 0;
    const runtime = await bindNativeAppRuntime({
        ...surface, capacitor: android,
        requestExit: () => {
            exitRequests += 1;
            return new Promise(resolve => { resolveConfirmation = resolve; });
        }
    });
    const pending = runtime.handleBackButton();
    await Promise.resolve();
    await runtime.handleBackButton();
    assert.equal(exitRequests, 1);
    resolveConfirmation(false);
    await pending;
    assert.equal(surface.calls.exits, 0);
    const confirmed = runtime.handleBackButton();
    await Promise.resolve();
    resolveConfirmation(true);
    await confirmed;
    assert.equal(surface.calls.exits, 1);
    await runtime.dispose();
});

test('a missing exit adapter dispatches a confirmation request without terminating the app', async () => {
    const surface = createSurface();
    let requests = 0;
    surface.events.set('ikkyee:native-exit-request', event => {
        assert.equal(event.detail.platform, 'android');
        requests += 1;
    });
    const runtime = await bindNativeAppRuntime({ ...surface, capacitor: android });
    await runtime.handleBackButton();
    assert.equal(requests, 1);
    assert.equal(surface.calls.exits, 0);
    await runtime.dispose();
});

test('iOS sets the native class but never installs an Android back or exit handler', async () => {
    const surface = createSurface();
    const runtime = await bindNativeAppRuntime({ ...surface, capacitor: ios });
    assert.equal(surface.classNames.has('native-ios'), true);
    assert.equal(surface.pluginEvents.has('backButton'), false);
    await runtime.handleBackButton();
    assert.equal(surface.calls.exits, 0);
    await runtime.dispose();
});

test('native plugin failure leaves page bootstrap usable and dispose cancels pending exit', async () => {
    const surface = createSurface();
    const runtime = await bindNativeAppRuntime({
        ...surface, capacitor: android, appPlugin: undefined,
        loadAppPlugin: async () => { throw new Error('native bridge unavailable'); }
    });
    assert.equal(runtime.native, true);
    assert.equal(runtime.backButtonBound, false);
    await runtime.dispose();

    let resolveConfirmation;
    const pendingRuntime = await bindNativeAppRuntime({
        ...surface, capacitor: android,
        requestExit: () => new Promise(resolve => { resolveConfirmation = resolve; })
    });
    const pending = pendingRuntime.handleBackButton();
    await Promise.resolve();
    await pendingRuntime.dispose();
    resolveConfirmation(true);
    await pending;
    assert.equal(surface.calls.exits, 0);
});
