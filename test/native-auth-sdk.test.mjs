import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { createNativeAuthStorage } from '../js/native-auth-storage.mjs';
import { authorizeNativeOAuth } from '../js/native-auth-bridge.mjs';

test('pinned real SDK creates a valid native OAuth request using the encrypted-storage adapter', async () => {
    const stored = new Map();
    const storage = createNativeAuthStorage({
        capacitor: { isNativePlatform: () => true },
        loadStorage: async () => ({
            KeychainAccess: { whenUnlockedThisDeviceOnly: 1 },
            SecureStorage: {
                setKeyPrefix: async () => {}, setSynchronize: async () => {}, setDefaultKeychainAccess: async () => {},
                getItem: async key => stored.get(key) ?? null,
                setItem: async (key, value) => { stored.set(key, value); },
                removeItem: async key => { stored.delete(key); }
            }
        })
    });
    const url = 'https://fixture.supabase.co';
    const sb = createClient(url, 'sb_publishable_fixture', {
        auth: { storage, flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: false },
        global: { fetch: () => { assert.fail('OAuth URL creation must not call a server or sign in a real account'); } }
    });
    let opened;
    const result = await authorizeNativeOAuth(sb.auth, 'google', {
        supabaseUrl: url, browser: { open: async ({ url: value }) => { opened = value; } }
    });
    assert.equal(result.error, null);
    const request = new URL(opened);
    assert.equal(request.searchParams.get('redirect_to'), 'ikkyee://auth/callback');
    assert.equal(request.searchParams.get('code_challenge_method'), 's256');
    assert.ok([...stored.keys()].some(key => key.endsWith('-code-verifier')));
    for (const value of stored.values()) assert.equal(opened.includes(value), false, 'verifier never leaves encrypted storage');
});
