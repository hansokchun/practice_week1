import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createNativeAuthStorage } from '../js/native-auth-storage.mjs';

const native = { isNativePlatform: () => true, getPlatform: () => 'ios' };
const web = { isNativePlatform: () => false, getPlatform: () => 'web' };
const PREFIX = 'ikkyee.auth.';
const AUTH_KEY = 'sb-example-auth-token';

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((accept, fail) => { resolve = accept; reject = fail; });
    return { promise, resolve, reject };
}

function createPlugin() {
    let prefix = 'capacitor-storage_';
    const stored = new Map([['unrelated.preference', 'keep']]);
    const calls = [];
    const SecureStorage = {
        async setKeyPrefix(value) { calls.push(['prefix', value]); prefix = value; },
        async setSynchronize(value) { calls.push(['sync', value]); },
        async setDefaultKeychainAccess(value) { calls.push(['access', value]); },
        async getItem(key) {
            calls.push(['get', prefix + key]);
            return stored.get(prefix + key) ?? null;
        },
        async setItem(key, value) { calls.push(['set', prefix + key]); stored.set(prefix + key, value); },
        async removeItem(key) { calls.push(['remove', prefix + key]); stored.delete(prefix + key); },
        async clear() { throw new Error('broad deletion must never be used'); }
    };
    return { module: { SecureStorage, KeychainAccess: { whenUnlockedThisDeviceOnly: 1 } }, stored, calls };
}

function isSafeStorageError(error) {
    assert.equal(error.name, 'NativeAuthStorageError');
    assert.equal(error.code, 'NATIVE_AUTH_STORAGE_UNAVAILABLE');
    assert.equal('cause' in error, false);
    assert.equal(error.message.includes('internal-private-detail'), false);
    return true;
}

test('native storage refuses browser and phone user agents before loading the plugin', () => {
    let loads = 0;
    const loadStorage = () => { loads += 1; throw new Error('must not run'); };
    for (const capacitor of [web, null, { userAgent: 'Android', getPlatform: () => 'android' }]) {
        assert.throws(() => createNativeAuthStorage({ capacitor, loadStorage }), isSafeStorageError);
    }
    assert.equal(loads, 0);
});

test('storage is lazy and implements only the Supabase string storage contract', async () => {
    const fake = createPlugin();
    let loads = 0;
    const storage = createNativeAuthStorage({ capacitor: native, loadStorage: async () => {
        loads += 1;
        return fake.module;
    } });
    assert.equal(loads, 0);
    assert.deepEqual(Object.keys(storage).sort(), ['getItem', 'removeItem', 'setItem']);
    assert.equal(await storage.getItem(AUTH_KEY), null);
    await storage.setItem(AUTH_KEY, 'session-one');
    assert.equal(await storage.getItem(AUTH_KEY), 'session-one');
    await storage.removeItem(AUTH_KEY);
    assert.equal(await storage.getItem(AUTH_KEY), null);
    assert.equal(loads, 1);
    assert.deepEqual(fake.calls.slice(0, 3), [['prefix', PREFIX], ['sync', false], ['access', 1]]);
    assert.equal(fake.stored.get('unrelated.preference'), 'keep');
    assert.ok(fake.calls.filter(([method]) => ['get', 'set', 'remove'].includes(method))
        .every(([, key]) => key.startsWith(PREFIX)));
});

test('parallel first operations wait for one complete secure configuration', async () => {
    const fake = createPlugin();
    const release = deferred();
    const started = deferred();
    let loads = 0;
    fake.module.SecureStorage.setKeyPrefix = async value => {
        started.resolve();
        await release.promise;
        // Restore the fake's effective namespace after the delayed setup.
        fake.calls.push(['prefix', value]);
        fake.module.SecureStorage.getItem = async key => {
            fake.calls.push(['get', value + key]);
            return fake.stored.get(value + key) ?? null;
        };
        fake.module.SecureStorage.setItem = async (key, valueToStore) => {
            fake.calls.push(['set', value + key]);
            fake.stored.set(value + key, valueToStore);
        };
    };
    const storage = createNativeAuthStorage({ capacitor: native, loadStorage: async () => {
        loads += 1;
        return fake.module;
    } });
    const write = storage.setItem(AUTH_KEY, 'session-one');
    const read = storage.getItem(AUTH_KEY);
    await started.promise;
    assert.equal(fake.calls.length, 0, 'no storage operation may use the plugin default prefix');
    release.resolve();
    await write;
    assert.equal(await read, 'session-one');
    assert.equal(loads, 1);
    assert.deepEqual(fake.calls.slice(0, 3), [['prefix', PREFIX], ['sync', false], ['access', 1]]);
});

test('concurrent adapters share configuration and preserve invocation order across slow writes', async () => {
    const fake = createPlugin();
    const firstStarted = deferred();
    const firstReleased = deferred();
    const originalSetItem = fake.module.SecureStorage.setItem;
    let activeWrites = 0;
    let maximumWrites = 0;
    fake.module.SecureStorage.setItem = async (key, value) => {
        activeWrites += 1;
        maximumWrites = Math.max(activeWrites, maximumWrites);
        if (value === 'first') {
            firstStarted.resolve();
            await firstReleased.promise;
        }
        await originalSetItem(key, value);
        activeWrites -= 1;
    };
    const loadStorage = async () => fake.module;
    const first = createNativeAuthStorage({ capacitor: native, loadStorage });
    const second = createNativeAuthStorage({ capacitor: native, loadStorage });
    const writes = [first.setItem(AUTH_KEY, 'first'), second.setItem(AUTH_KEY, 'second')];
    await firstStarted.promise;
    assert.equal(fake.stored.has(PREFIX + AUTH_KEY), false);
    firstReleased.resolve();
    await Promise.all(writes);
    assert.equal(await first.getItem(AUTH_KEY), 'second');
    assert.equal(maximumWrites, 1);
    assert.equal(fake.calls.filter(([method]) => method === 'prefix').length, 1);
});

test('logout deletion follows pending refresh writes and never deletes other namespaces', async () => {
    const fake = createPlugin();
    const storage = createNativeAuthStorage({ capacitor: native, loadStorage: async () => fake.module });
    await Promise.all([
        storage.setItem(AUTH_KEY, 'session-one'),
        storage.setItem(AUTH_KEY, 'session-two'),
        storage.removeItem(AUTH_KEY)
    ]);
    assert.equal(await storage.getItem(AUTH_KEY), null);
    assert.equal(fake.stored.get('unrelated.preference'), 'keep');
    assert.equal(storage.clear, undefined);
});

test('an initial plugin load failure is retained, sanitized and never falls back', async () => {
    let loads = 0;
    const storage = createNativeAuthStorage({ capacitor: native, loadStorage: async () => {
        loads += 1;
        throw new Error('internal-private-detail');
    } });
    for (const operation of [() => storage.getItem(AUTH_KEY), () => storage.setItem(AUTH_KEY, 'session'),
        () => storage.removeItem(AUTH_KEY)]) {
        await assert.rejects(operation, isSafeStorageError);
    }
    assert.equal(loads, 1);
});

test('any secure setup failure prevents all data operations and remains sanitized', async () => {
    for (const method of ['setKeyPrefix', 'setSynchronize', 'setDefaultKeychainAccess']) {
        const fake = createPlugin();
        fake.module.SecureStorage[method] = async () => { throw new Error('internal-private-detail'); };
        const storage = createNativeAuthStorage({ capacitor: native, loadStorage: async () => fake.module });
        await assert.rejects(() => storage.setItem(AUTH_KEY, 'session'), isSafeStorageError);
        await assert.rejects(() => storage.getItem(AUTH_KEY), isSafeStorageError);
        assert.equal(fake.stored.has(PREFIX + AUTH_KEY), false);
        assert.equal(fake.calls.some(([action]) => ['get', 'set', 'remove'].includes(action)), false);
    }
});

test('raw operation errors are hidden and do not poison subsequent secure operations', async () => {
    for (const method of ['getItem', 'setItem', 'removeItem']) {
        const fake = createPlugin();
        const original = fake.module.SecureStorage[method];
        let fail = true;
        fake.module.SecureStorage[method] = async (...args) => {
            if (fail) { fail = false; throw new Error('internal-private-detail'); }
            return original(...args);
        };
        const storage = createNativeAuthStorage({ capacitor: native, loadStorage: async () => fake.module });
        await assert.rejects(() => storage[method](AUTH_KEY, 'session'), isSafeStorageError);
        await storage[method](AUTH_KEY, 'session');
        assert.equal(fake.stored.get('unrelated.preference'), 'keep');
    }
});

test('nonstring storage values, invalid inputs and incomplete plugins fail safely', async () => {
    const fake = createPlugin();
    const storage = createNativeAuthStorage({ capacitor: native, loadStorage: async () => fake.module });
    for (const key of ['', '  ', null, 'bad\nkey']) {
        await assert.rejects(() => storage.getItem(key), isSafeStorageError);
    }
    await assert.rejects(() => storage.setItem(AUTH_KEY, { access: 'private' }), isSafeStorageError);
    fake.stored.set(PREFIX + AUTH_KEY, { unexpected: true });
    await assert.rejects(() => storage.getItem(AUTH_KEY), isSafeStorageError);

    const incomplete = createNativeAuthStorage({ capacitor: native, loadStorage: async () => ({ SecureStorage: {} }) });
    await assert.rejects(() => incomplete.getItem(AUTH_KEY), isSafeStorageError);
});

test('losing the native bridge before or during loading never reaches a web storage operation', async () => {
    let isNative = true;
    const capacitor = { isNativePlatform: () => isNative };
    const fake = createPlugin();
    let loads = 0;
    const storage = createNativeAuthStorage({ capacitor, loadStorage: async () => {
        loads += 1;
        isNative = false;
        return fake.module;
    } });
    await assert.rejects(() => storage.getItem(AUTH_KEY), isSafeStorageError);
    assert.equal(loads, 1);
    assert.equal(fake.calls.length, 0);
    await assert.rejects(() => storage.setItem(AUTH_KEY, 'session'), isSafeStorageError);
    assert.equal(fake.calls.length, 0);
});
