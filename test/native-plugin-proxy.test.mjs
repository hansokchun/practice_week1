import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bindNativeAppRuntime } from '../js/native-app-runtime.mjs';
import { authorizeNativeOAuth, cancelNativeOAuth, registerNativeAuthCallbacks } from '../js/native-auth-bridge.mjs';
import { createNativeAuthStorage } from '../js/native-auth-storage.mjs';
import { shareNativeContent } from '../js/native-content-actions.mjs';
import { bindNativeExternalLinks } from '../js/native-external-links.mjs';

// Use the installed Capacitor proxies, not plain-object plugin mocks. Their
// synthetic `then` method must never be assimilated by a Promise.
const calls = [];
globalThis.window = globalThis;
globalThis.androidBridge = {};
globalThis.Capacitor = {
    PluginHeaders: ['App', 'Browser', 'Share'].map(name => ({ name, methods: [
        ...['open', 'close', 'share', 'getLaunchUrl', 'exitApp'].map(name => ({ name, rtype: 'promise' })),
        { name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'callback' }
    ] })),
    nativePromise: async (plugin, method, options) => { calls.push([plugin, method, options]); return {}; },
    nativeCallback: (plugin, method, options) => { calls.push([plugin, method, options]); return 'listener-id'; }
};
const native = { isNativePlatform: () => true, getPlatform: () => 'android' };

test('default Android runtime loader resolves with the real Capacitor App proxy', { timeout: 1500 }, async () => {
    const runtime = await bindNativeAppRuntime({ capacitor: native, window: {}, document: {} });
    assert.equal(runtime.backButtonBound, true);
    await runtime.dispose();
});

test('OAuth browser registration, open and cancellation never await the Browser proxy', { timeout: 1500 }, async () => {
    const dispose = await registerNativeAuthCallbacks({}, {});
    const origin = 'https://example.supabase.co';
    const auth = { signInWithOAuth: async () => ({ data: { url: origin + '/auth/v1/authorize?provider=google&redirect_to=ikkyee%3A%2F%2Fauth%2Fcallback&code_challenge=test&code_challenge_method=s256' } }) };
    const result = await authorizeNativeOAuth(auth, 'google', { supabaseUrl: origin });
    assert.equal(result.error, null);
    assert.equal(result.data.status, 'pending');
    await cancelNativeOAuth();
    await dispose();
    assert.ok(calls.some(([plugin, method]) => plugin === 'Browser' && method === 'open'));
    assert.ok(calls.some(([plugin, method]) => plugin === 'Browser' && method === 'close'));
});

test('encrypted session configuration does not assimilate a thenable plugin', { timeout: 1500 }, async () => {
    let value = null;
    let thenReads = 0;
    const plugin = new Proxy({
        setKeyPrefix: async () => {}, setSynchronize: async () => {}, setDefaultKeychainAccess: async () => {},
        getItem: async () => value, setItem: async (_key, next) => { value = next; }, removeItem: async () => { value = null; }
    }, { get(target, key) {
        if (key === 'then') { thenReads++; throw new Error('Plugin is not a Promise'); }
        return target[key];
    } });
    const storage = createNativeAuthStorage({ capacitor: native,
        loadStorage: async () => ({ SecureStorage: plugin, KeychainAccess: { whenUnlockedThisDeviceOnly: 1 } }) });
    await storage.setItem('test-session', 'test-value');
    assert.equal(await storage.getItem('test-session'), 'test-value');
    await storage.removeItem('test-session');
    assert.equal(await storage.getItem('test-session'), null);
    assert.equal(thenReads, 0);
});

test('default native sharing resolves through the installed Share proxy', { timeout: 1500 }, async () => {
    const result = await shareNativeContent({ url: 'https://ikkyee.com/share/photo/test' }, { capacitor: native });
    assert.equal(result.error, null);
    assert.equal(result.data.status, 'shared');
});

test('default external-link browser opens without assimilating its proxy', { timeout: 1500 }, async () => {
    let click;
    const document = { baseURI: 'https://localhost/index.html', addEventListener: (_name, fn) => { click = fn; }, removeEventListener() {} };
    const before = calls.length;
    const dispose = bindNativeExternalLinks({ capacitor: native, document });
    const anchor = { getAttribute: key => key === 'href' ? '/support/' : null, closest: () => null };
    click({ target: { closest: () => anchor }, preventDefault() {} });
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.ok(calls.slice(before).some(([plugin, method, options]) => plugin === 'Browser' && method === 'open' && options.url === 'https://ikkyee.com/support/'));
    dispose();
});
