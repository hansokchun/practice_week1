import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    NATIVE_AUTH_CALLBACK_URL,
    authorizeNativeOAuth,
    cancelNativeOAuth,
    consumeNativeAuthCallback,
    parseNativeAuthCallback,
    registerNativeAuthCallbacks
} from '../js/native-auth-bridge.mjs';

const SUPABASE_URL = 'https://example.supabase.co';
const authorizationUrl = (provider = 'google') => `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(NATIVE_AUTH_CALLBACK_URL)}&code_challenge=hashed-verifier&code_challenge_method=s256`;

function createAdapter(overrides = {}) {
    const calls = [];
    let pending = null;
    return {
        supabaseUrl: SUPABASE_URL,
        returnRoute: '#/my-photos',
        calls,
        browser: {
            open: async (options) => { calls.push(['open', options]); },
            close: async () => { calls.push(['close']); }
        },
        setPending: async (value) => { pending = value; calls.push(['pending', value]); },
        getPending: async () => pending,
        clearPending: async () => { pending = null; calls.push(['clear']); },
        onComplete: async (data) => { calls.push(['complete', data]); },
        onError: async (error) => { calls.push(['error', error]); },
        ...overrides
    };
}

test('native OAuth keeps the PKCE verifier in this app and opens only the system browser', async () => {
    const adapter = createAdapter();
    const authCalls = [];
    const auth = { signInWithOAuth: async (input) => {
        authCalls.push(input);
        return { data: { url: authorizationUrl() }, error: null };
    } };
    const result = await authorizeNativeOAuth(auth, 'google', adapter);
    assert.equal(result.error, null);
    assert.deepEqual(authCalls, [{ provider: 'google', options: { redirectTo: 'ikkyee://auth/callback', skipBrowserRedirect: true } }]);
    assert.deepEqual(await adapter.getPending(), { provider: 'google', returnRoute: '#/my-photos' });
    assert.deepEqual(adapter.calls.find(([name]) => name === 'open'), ['open', { url: authorizationUrl() }]);
    assert.equal(JSON.stringify(result).includes('code_challenge'), false);
});

test('native Kakao OAuth retains the mobile login prompt', async () => {
    const adapter = createAdapter();
    let credentials;
    const result = await authorizeNativeOAuth({ signInWithOAuth: async (input) => {
        credentials = input;
        return { data: { url: authorizationUrl('kakao') }, error: null };
    } }, 'kakao', adapter);
    assert.equal(result.error, null);
    assert.deepEqual(credentials.options.queryParams, { prompt: 'login' });
});

test('native OAuth denies unsupported providers before making an auth request', async () => {
    let called = false;
    const result = await authorizeNativeOAuth({ signInWithOAuth: async () => { called = true; } }, 'unknown', createAdapter());
    assert.equal(called, false);
    assert.equal(result.error.code, 'NATIVE_AUTH_PROVIDER');
});

test('authorization URLs must be PKCE HTTPS URLs from the configured auth service', async () => {
    for (const url of [
        'javascript:alert(1)',
        authorizationUrl().replace('https:', 'http:'),
        authorizationUrl().replace('example.supabase.co', 'unexpected.supabase.co'),
        authorizationUrl().replace('https://', 'https://credentials@'),
        authorizationUrl().replace('/auth/v1/authorize', '/unrelated'),
        authorizationUrl().replace('&code_challenge=hashed-verifier&code_challenge_method=s256', ''),
        authorizationUrl().replace('code_challenge_method=s256', 'code_challenge_method=plain'),
        authorizationUrl().replace('provider=google', 'provider=kakao')
    ]) {
        const adapter = createAdapter();
        const result = await authorizeNativeOAuth({ signInWithOAuth: async () => ({ data: { url }, error: null }) }, 'google', adapter);
        assert.equal(result.error.code, 'NATIVE_AUTH_URL');
        assert.equal(adapter.calls.some(([name]) => name === 'open'), false);
        assert.equal(await adapter.getPending(), null);
    }
});

test('OAuth request and browser launch failures clear pending state and hide raw details', async () => {
    const privateError = new Error('private callback token and provider detail');
    for (const auth of [
        { signInWithOAuth: async () => { throw privateError; } },
        { signInWithOAuth: async () => ({ data: null, error: privateError }) },
        { signInWithOAuth: async () => ({ data: { url: authorizationUrl() }, error: null }) }
    ]) {
        const adapter = createAdapter({ browser: { open: async () => { throw privateError; } } });
        const result = await authorizeNativeOAuth(auth, 'google', adapter);
        assert.equal(result.data, null);
        assert.equal(await adapter.getPending(), null);
        assert.doesNotMatch(result.error.message, /private|token|detail/);
    }
});

test('overlapping native OAuth attempts cannot overwrite an existing verifier', async () => {
    const adapter = createAdapter();
    await adapter.setPending({ provider: 'google', returnRoute: '#/my-photos' });
    let called = false;
    const result = await authorizeNativeOAuth({ signInWithOAuth: async () => { called = true; } }, 'kakao', adapter);
    assert.equal(called, false);
    assert.equal(result.error.code, 'NATIVE_AUTH_IN_PROGRESS');
    assert.deepEqual(await adapter.getPending(), { provider: 'google', returnRoute: '#/my-photos' });
});

test('explicit native login cancellation clears only pending navigation metadata', async () => {
    const adapter = createAdapter();
    await adapter.setPending({ provider: 'google', returnRoute: '#/my-photos' });
    adapter.onCancel = async () => { adapter.calls.push(['cancel']); };
    const result = await cancelNativeOAuth(adapter);
    assert.deepEqual(result, { data: { status: 'cancelled' }, error: null });
    assert.equal(await adapter.getPending(), null);
    assert.equal(adapter.calls.filter(([name]) => name === 'close').length, 1);
    assert.equal(adapter.calls.filter(([name]) => name === 'cancel').length, 1);
});

test('native cancellation remains successful when programmatic browser closing is unavailable', async () => {
    const adapter = createAdapter({ browser: { close: async () => { throw new Error('private native browser error'); } } });
    await adapter.setPending({ provider: 'google', returnRoute: '#/my-photos' });
    const result = await cancelNativeOAuth(adapter);
    assert.equal(result.error, null);
    assert.equal(await adapter.getPending(), null);
});

test('pending storage removal failure does not falsely report a cancelled login', async () => {
    const adapter = createAdapter({ clearPending: async () => { throw new Error('private storage detail'); } });
    const result = await cancelNativeOAuth(adapter);
    assert.equal(result.data, null);
    assert.equal(result.error.code, 'NATIVE_AUTH_CANCEL');
    assert.doesNotMatch(result.error.message, /private|storage|detail/);
    assert.equal(adapter.calls.some(([name]) => name === 'cancel'), false);
});

test('cancelling during an OAuth request prevents its late result from reopening the browser', async () => {
    const adapter = createAdapter();
    let release;
    let markStarted;
    const started = new Promise(resolve => { markStarted = resolve; });
    const signingIn = authorizeNativeOAuth({ signInWithOAuth: async () => {
        markStarted();
        return new Promise(resolve => { release = resolve; });
    } }, 'google', adapter);
    await started;
    await cancelNativeOAuth(adapter);
    release({ data: { url: authorizationUrl() }, error: null });
    const result = await signingIn;
    assert.equal(result.error, null);
    assert.equal(result.data.status, 'cancelled');
    assert.equal(adapter.calls.some(([name]) => name === 'open'), false);
});

test('only the exact native auth callback target can process credentials', () => {
    assert.deepEqual(parseNativeAuthCallback('ikkyee://auth/callback?code=one-time-code'), { type: 'code', code: 'one-time-code', recovery: false });
    for (const url of [
        'https://auth/callback?code=one-time-code',
        'ikkyee://wrong/callback?code=one-time-code',
        'ikkyee://auth/wrong?code=one-time-code',
        'ikkyee://auth/callback/?code=one-time-code',
        'ikkyee://user@auth/callback?code=one-time-code',
        'ikkyee://auth:123/callback?code=one-time-code',
        'not-a-url'
    ]) assert.equal(parseNativeAuthCallback(url), null);
});

test('callback provider errors, implicit tokens and ambiguous codes stay generic', () => {
    for (const url of [
        'ikkyee://auth/callback?error=access_denied&error_description=private-provider-detail',
        'ikkyee://auth/callback#error=access_denied&error_description=private-provider-detail',
        'ikkyee://auth/callback#access_token=private&refresh_token=secret',
        'ikkyee://auth/callback?code=one&access_token=private',
        'ikkyee://auth/callback?code=one&code=two',
        'ikkyee://auth/callback#code=one',
        'ikkyee://auth/callback?code=',
        'ikkyee://auth/callback'
    ]) {
        const parsed = parseNativeAuthCallback(url);
        assert.equal(parsed.type, 'error');
        assert.doesNotMatch(parsed.error.message, /private|secret|access_denied/);
    }
});

test('PKCE callback exchanges once and restores safe pending route without trusting callback route', async () => {
    const adapter = createAdapter();
    await adapter.setPending({ provider: 'google', returnRoute: '#/my-photos' });
    const authCalls = [];
    const session = { user: { id: 'owner' } };
    const result = await consumeNativeAuthCallback({ exchangeCodeForSession: async (code) => {
        authCalls.push(code);
        return { data: { session, user: session.user }, error: null };
    } }, 'ikkyee://auth/callback?code=one-time-code&next=https://untrusted.example', adapter);
    assert.deepEqual(authCalls, ['one-time-code']);
    assert.equal(result.handled, true);
    assert.equal(result.error, null);
    assert.equal(result.data.returnRoute, '#/my-photos');
    assert.equal(result.data.provider, 'google');
    assert.equal(result.data.session, session);
    assert.equal(await adapter.getPending(), null);
    assert.equal(adapter.calls.filter(([name]) => name === 'complete').length, 1);
});

test('unrelated app links do not close the browser or change auth state', async () => {
    const adapter = createAdapter();
    let called = false;
    const result = await consumeNativeAuthCallback({ exchangeCodeForSession: async () => { called = true; } }, 'ikkyee://photos/123', adapter);
    assert.deepEqual(result, { handled: false, data: null, error: null });
    assert.equal(called, false);
    assert.deepEqual(adapter.calls, []);
});

test('exchange errors clear pending auth and are sanitized; close failures do not break success', async () => {
    const adapter = createAdapter({ browser: { close: async () => { throw new Error('not supported'); } } });
    const auth = { exchangeCodeForSession: async () => ({ data: null, error: new Error('private-service-detail') }) };
    const result = await consumeNativeAuthCallback(auth, 'ikkyee://auth/callback?code=one-time-code', adapter);
    assert.equal(result.handled, true);
    assert.equal(result.error.code, 'NATIVE_AUTH_EXCHANGE');
    assert.doesNotMatch(result.error.message, /private-service-detail/);
    assert.equal(adapter.calls.filter(([name]) => name === 'error').length, 1);
    const success = await consumeNativeAuthCallback({ exchangeCodeForSession: async () => ({ data: { session: { user: {} } }, error: null }) }, 'ikkyee://auth/callback?code=another-code', adapter);
    assert.equal(success.error, null);
});

test('recovery callback is marked for password form and unsafe pending routes are discarded', async () => {
    const adapter = createAdapter({ getPending: async () => ({ provider: 'google', returnRoute: 'https://untrusted.example' }) });
    const result = await consumeNativeAuthCallback({ exchangeCodeForSession: async () => ({ data: { session: { user: {} } }, error: null }) }, 'ikkyee://auth/callback?code=one-time-code&type=recovery', adapter);
    assert.equal(result.data.recovery, true);
    assert.equal(result.data.returnRoute, '#/');
});

test('PKCE recovery uses verifier-bound SDK metadata when its URL contains only a code', async () => {
    const result = await consumeNativeAuthCallback({ exchangeCodeForSession: async () => ({
        data: { session: { user: {} }, redirectType: 'recovery' }, error: null
    }) }, 'ikkyee://auth/callback?code=recovery-code', createAdapter());
    assert.equal(result.error, null);
    assert.equal(result.data.recovery, true);
});

test('recovery UI is never completed when code exchange fails', async () => {
    const adapter = createAdapter();
    const result = await consumeNativeAuthCallback({ exchangeCodeForSession: async () => ({
        data: { session: null, redirectType: 'recovery' }, error: new Error('invalid verifier')
    }) }, 'ikkyee://auth/callback?code=recovery-code&type=recovery', adapter);
    assert.equal(result.data, null);
    assert.equal(result.error.code, 'NATIVE_AUTH_EXCHANGE');
    assert.equal(adapter.calls.some(([name]) => name === 'complete'), false);
});

test('UI callbacks cannot turn an established native session into a failed login', async () => {
    const result = await consumeNativeAuthCallback({ exchangeCodeForSession: async () => ({
        data: { session: { user: {} } }, error: null
    }) }, 'ikkyee://auth/callback?code=one-time-code', createAdapter({
        onComplete: async () => { throw new Error('render failure'); }
    }));
    assert.equal(result.error, null);
    assert.ok(result.data.session);
});

test('native app callbacks include cold launch, duplicate suppression, cancellation and owned listener cleanup', async () => {
    const appListeners = new Map();
    const browserListeners = new Map();
    const removed = [];
    const adapter = createAdapter({
        app: {
            addListener: async (name, handler) => { appListeners.set(name, handler); return { remove: async () => { removed.push(name); } }; },
            getLaunchUrl: async () => ({ url: 'ikkyee://auth/callback?code=cold-launch-code' })
        },
        onCancel: async () => { adapter.calls.push(['cancel']); }
    });
    adapter.browser.addListener = async (name, handler) => { browserListeners.set(name, handler); return { remove: async () => { removed.push(name); } }; };
    const exchanged = [];
    const dispose = await registerNativeAuthCallbacks({ exchangeCodeForSession: async (code) => {
        exchanged.push(code);
        return { data: { session: { user: {} } }, error: null };
    } }, adapter);
    assert.deepEqual(exchanged, ['cold-launch-code']);
    await appListeners.get('appUrlOpen')({ url: 'ikkyee://auth/callback?code=cold-launch-code' });
    assert.deepEqual(exchanged, ['cold-launch-code']);
    await adapter.setPending({ provider: 'google', returnRoute: '#/my-photos' });
    await browserListeners.get('browserFinished')();
    assert.equal(await adapter.getPending(), null);
    assert.equal(adapter.calls.filter(([name]) => name === 'cancel').length, 1);
    await dispose();
    assert.deepEqual(removed.sort(), ['appUrlOpen', 'browserFinished']);
});

test('browser cancellation storage errors are reported safely without rejecting the native event', async () => {
    let finished;
    const adapter = createAdapter({
        app: { addListener: async () => ({ remove: async () => {} }), getLaunchUrl: async () => null },
        getPending: async () => { throw new Error('private-storage-detail'); }
    });
    adapter.browser.addListener = async (_name, handler) => { finished = handler; return { remove: async () => {} }; };
    const dispose = await registerNativeAuthCallbacks({}, adapter);
    await assert.doesNotReject(finished());
    const failure = adapter.calls.find(([name]) => name === 'error')?.[1];
    assert.equal(failure.code, 'NATIVE_AUTH_LISTENER');
    assert.doesNotMatch(failure.message, /private-storage-detail/);
    await dispose();
});
