import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

for (const native of [false, true]) {
    test(`${native ? 'native' : 'browser'} email auth keeps CAPTCHA and uses its own redirect destination`, async () => {
        const previousClient = globalThis.supabase;
        const previousCapacitor = globalThis.Capacitor;
        const calls = [];
        globalThis.Capacitor = { isNativePlatform: () => native };
        globalThis.supabase = { createClient: (_url, _key, options) => {
            calls.push(['client', options]);
            return { auth: {
                signUp: async input => { calls.push(['signup', input]); return { data: { user: null }, error: null }; },
                resetPasswordForEmail: async (...args) => { calls.push(['reset', ...args]); return { data: {}, error: null }; }
            } };
        } };
        try {
            // auth.js is a browser ES module in a CommonJS package. Load its
            // unchanged code with absolute helper imports, without a temp copy.
            const moduleUrl = new URL('../auth.js', import.meta.url);
            const source = readFileSync(moduleUrl, 'utf8').replace(/from '(\.\/js\/[^']+)'/g,
                (_match, path) => `from '${new URL(path, moduleUrl).href}'`);
            const auth = await import(`data:text/javascript;base64,${Buffer.from(`${source}\n// fixture ${native}`).toString('base64')}`);
            const options = { captchaToken: 'test-captcha', redirectTo: 'https://dev.practice-week1-cws.pages.dev/' };
            assert.equal((await auth.signUpWithEmail('fixture@example.test', 'not-a-real-password', options)).error, null);
            assert.equal((await auth.resetPasswordForEmail('fixture@example.test', options)).error, null);
            const redirectTo = native ? 'ikkyee://auth/callback' : options.redirectTo;
            assert.deepEqual(calls[1][1].options, { captchaToken: options.captchaToken, emailRedirectTo: redirectTo });
            assert.deepEqual(calls[2].slice(1), ['fixture@example.test', { captchaToken: options.captchaToken, redirectTo }]);
            assert.equal(options.redirectTo, 'https://dev.practice-week1-cws.pages.dev/');
            if (native) {
                assert.equal(calls[0][1].auth.flowType, 'pkce');
                assert.equal(typeof calls[0][1].auth.storage.getItem, 'function');
            } else {
                assert.equal(calls[0][1], undefined);
            }
        } finally {
            globalThis.supabase = previousClient;
            globalThis.Capacitor = previousCapacitor;
        }
    });
}
