import { isNativeApp } from './native-app-runtime.mjs';

const AUTH_STORAGE_PREFIX = 'ikkyee.auth.';
const configuredPlugins = new WeakMap();
// The plugin prefix and keychain defaults are global. Serialize all adapters,
// including initialization, so refresh writes cannot finish after logout removal.
let operationQueue = Promise.resolve();

export class NativeAuthStorageError extends Error {
    constructor() {
        super('앱의 로그인 정보를 안전하게 보관할 수 없어요. 앱을 다시 열어주세요.');
        this.name = 'NativeAuthStorageError';
        this.code = 'NATIVE_AUTH_STORAGE_UNAVAILABLE';
    }
}

async function loadDefaultStorage() {
    return import('@aparajita/capacitor-secure-storage');
}

function enqueueOperation(operation) {
    const result = operationQueue.then(operation);
    operationQueue = result.then(() => undefined, () => undefined);
    return result;
}

function validateKey(key) {
    if (typeof key !== 'string' || !key || key.trim() !== key
        || key.length > 1024 || /[\u0000-\u001f\u007f]/u.test(key)) {
        throw new NativeAuthStorageError();
    }
}

/**
 * Supabase's SupportedStorage contract, backed only by native encrypted storage.
 * Loading/OS failures stay failures: no localStorage, memory or preferences
 * fallback may silently turn a protected session into an unprotected one.
 */
export function createNativeAuthStorage({
    capacitor = globalThis.Capacitor,
    loadStorage = loadDefaultStorage
} = {}) {
    const ensureNative = () => {
        if (!isNativeApp(capacitor)) throw new NativeAuthStorageError();
    };
    ensureNative();

    let storagePromise;
    const getStorage = () => {
        if (!storagePromise) {
            // Cache rejection too; a broken initialization must not be followed
            // by retrying with the plugin's default namespace or web fallback.
            storagePromise = (async () => {
                ensureNative();
                const module = await loadStorage();
                ensureNative();
                const plugin = module?.SecureStorage;
                const access = module?.KeychainAccess?.whenUnlockedThisDeviceOnly;
                const required = ['setKeyPrefix', 'setSynchronize', 'setDefaultKeychainAccess',
                    'getItem', 'setItem', 'removeItem'];
                if (!plugin || !['object', 'function'].includes(typeof plugin)
                    || !Number.isInteger(access) || access < 0
                    || required.some(method => typeof plugin[method] !== 'function')) {
                    throw new NativeAuthStorageError();
                }

                if (!configuredPlugins.has(plugin)) {
                    const ready = Promise.resolve().then(async () => {
                        ensureNative();
                        await plugin.setKeyPrefix(AUTH_STORAGE_PREFIX);
                        ensureNative();
                        await plugin.setSynchronize(false);
                        ensureNative();
                        await plugin.setDefaultKeychainAccess(access);
                        // The Capacitor proxy is thenable; never resolve a
                        // Promise with the raw encrypted-storage plugin.
                        return { plugin };
                    });
                    configuredPlugins.set(plugin, ready);
                }
                return configuredPlugins.get(plugin);
            })();
        }
        return storagePromise;
    };

    const execute = (method, key, value) => enqueueOperation(async () => {
        ensureNative();
        validateKey(key);
        if (method === 'setItem' && typeof value !== 'string') throw new NativeAuthStorageError();
        const { plugin } = await getStorage();
        ensureNative();
        const result = method === 'setItem'
            ? await plugin.setItem(key, value)
            : await plugin[method](key);
        if (method === 'getItem') {
            if (result !== null && typeof result !== 'string') throw new NativeAuthStorageError();
            return result;
        }
        return undefined;
    }).catch(() => {
        // Do not retain the raw message or cause: native errors can contain keys,
        // session contents or platform-specific diagnostic information.
        throw new NativeAuthStorageError();
    });

    return Object.freeze({
        getItem: key => execute('getItem', key),
        setItem: (key, value) => execute('setItem', key, value),
        removeItem: key => execute('removeItem', key)
    });
}
