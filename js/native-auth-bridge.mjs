export const NATIVE_AUTH_CALLBACK_URL = 'ikkyee://auth/callback';

const PROVIDERS = new Set(['google', 'kakao']);
const launchingClients = new WeakSet();
const ERROR_MESSAGES = {
    NATIVE_AUTH_PROVIDER: '지원하지 않는 로그인 방법입니다.',
    NATIVE_AUTH_IN_PROGRESS: '진행 중인 로그인을 마친 후 다시 시도해주세요.',
    NATIVE_AUTH_URL: '로그인 주소를 확인하지 못했습니다. 다시 시도해주세요.',
    NATIVE_AUTH_START: '로그인을 시작하지 못했습니다. 다시 시도해주세요.',
    NATIVE_AUTH_CANCEL: '진행 중인 로그인을 취소하지 못했습니다. 다시 시도해주세요.',
    NATIVE_AUTH_CALLBACK: '로그인을 완료하지 못했습니다. 다시 시도해주세요.',
    NATIVE_AUTH_EXCHANGE: '로그인 시간이 만료되었거나 인증에 실패했습니다. 다시 시도해주세요.',
    NATIVE_AUTH_LISTENER: '앱 로그인 연결을 준비하지 못했습니다. 다시 시도해주세요.'
};

function authError(code) {
    const error = new Error(ERROR_MESSAGES[code]);
    error.code = code;
    return error;
}

function safeReturnRoute(route) {
    return typeof route === 'string' && /^#\/(?!\/)[^\\\r\n]*$/.test(route) && route.length <= 2048
        ? route
        : '#/';
}

async function notify(adapter, event, value) {
    try {
        await adapter[event]?.(value);
    } catch {
        // UI or telemetry failures must not expose provider details or undo a session.
    }
}

async function clearPending(adapter) {
    try {
        await adapter.clearPending?.();
    } catch {
        // Pending state contains only navigation metadata, never credentials.
    }
}

async function getBrowser(adapter) {
    if (adapter.browser) return adapter.browser;
    const { Browser } = await import('@capacitor/browser');
    return Browser;
}

async function closeBrowser(adapter) {
    try {
        const browser = await getBrowser(adapter);
        await browser.close?.();
    } catch {
        // Closing is unavailable on some native browser implementations.
    }
}

function requireAuthorizationUrl(value, supabaseUrl, provider) {
    let url;
    let service;
    try {
        url = new URL(value);
        service = new URL(supabaseUrl);
    } catch {
        throw authError('NATIVE_AUTH_URL');
    }
    if (typeof value !== 'string'
        || url.protocol !== 'https:'
        || service.protocol !== 'https:'
        || service.username || service.password
        || url.username || url.password
        || url.origin !== service.origin
        || url.pathname !== '/auth/v1/authorize'
        || url.hash
        || url.searchParams.get('provider') !== provider
        || url.searchParams.get('redirect_to') !== NATIVE_AUTH_CALLBACK_URL
        || !url.searchParams.get('code_challenge')
        || url.searchParams.get('code_challenge_method')?.toLowerCase() !== 's256') {
        throw authError('NATIVE_AUTH_URL');
    }
    return url.toString();
}

/** The client must use flowType: 'pkce' and detectSessionInUrl: false. */
export async function authorizeNativeOAuth(auth, provider, adapter = {}) {
    if (!PROVIDERS.has(provider)) return { data: null, error: authError('NATIVE_AUTH_PROVIDER') };
    if (launchingClients.has(auth)) return { data: null, error: authError('NATIVE_AUTH_IN_PROGRESS') };
    launchingClients.add(auth);
    let ownsPending = false;
    try {
        if (await adapter.getPending?.()) {
            return { data: null, error: authError('NATIVE_AUTH_IN_PROGRESS') };
        }
        const pending = { provider, returnRoute: safeReturnRoute(adapter.returnRoute) };
        ownsPending = true;
        await adapter.setPending?.(pending);
        const { data, error } = await auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: NATIVE_AUTH_CALLBACK_URL,
                skipBrowserRedirect: true,
                ...(provider === 'kakao' ? { queryParams: { prompt: 'login' } } : {})
            }
        });
        if (error) throw authError('NATIVE_AUTH_START');
        const url = requireAuthorizationUrl(data?.url, adapter.supabaseUrl, provider);
        const browser = await getBrowser(adapter);
        if (adapter.getPending && !(await adapter.getPending())) {
            return { data: { provider, status: 'cancelled' }, error: null };
        }
        await browser.open({ url });
        return { data: { provider, status: 'pending' }, error: null };
    } catch (error) {
        if (ownsPending) await clearPending(adapter);
        return { data: null, error: error?.code === 'NATIVE_AUTH_URL' ? authError('NATIVE_AUTH_URL') : authError('NATIVE_AUTH_START') };
    } finally {
        launchingClients.delete(auth);
    }
}

/** Cancel an abandoned browser attempt without signing out an existing session. */
export async function cancelNativeOAuth(adapter = {}) {
    try {
        await adapter.clearPending?.();
    } catch {
        return { data: null, error: authError('NATIVE_AUTH_CANCEL') };
    }
    await closeBrowser(adapter);
    await notify(adapter, 'onCancel');
    return { data: { status: 'cancelled' }, error: null };
}

/** Unrelated links return null; credential errors never retain raw provider text. */
export function parseNativeAuthCallback(value) {
    let url;
    try {
        if (typeof value !== 'string' || value !== value.trim() || value.length > 16384) return null;
        url = new URL(value);
    } catch {
        return null;
    }
    if (url.protocol !== 'ikkyee:' || url.hostname !== 'auth' || url.pathname !== '/callback'
        || url.username || url.password || url.port) return null;

    const fragment = new URLSearchParams(url.hash.slice(1));
    const query = url.searchParams;
    const invalidCredentials = ['access_token', 'refresh_token', 'token_hash', 'id_token']
        .some((key) => query.has(key) || fragment.has(key));
    const providerError = ['error', 'error_code', 'error_description']
        .some((key) => query.has(key) || fragment.has(key));
    const codes = query.getAll('code');
    if (invalidCredentials || providerError || fragment.has('code') || codes.length !== 1
        || !codes[0] || codes[0].length > 4096 || /\s/.test(codes[0])) {
        return { type: 'error', error: authError('NATIVE_AUTH_CALLBACK') };
    }
    return { type: 'code', code: codes[0], recovery: query.get('type') === 'recovery' };
}

export async function consumeNativeAuthCallback(auth, value, adapter = {}) {
    const callback = parseNativeAuthCallback(value);
    if (!callback) return { handled: false, data: null, error: null };

    let result;
    try {
        if (callback.type === 'error') throw callback.error;
        const pending = await adapter.getPending?.();
        const { data, error } = await auth.exchangeCodeForSession(callback.code);
        if (error || !data?.session) throw authError('NATIVE_AUTH_EXCHANGE');
        result = {
            handled: true,
            data: {
                session: data.session,
                user: data.user || data.session.user,
                provider: PROVIDERS.has(pending?.provider) ? pending.provider : null,
                returnRoute: safeReturnRoute(pending?.returnRoute),
                recovery: callback.recovery || data.redirectType === 'recovery'
            },
            error: null
        };
    } catch (error) {
        result = {
            handled: true,
            data: null,
            error: authError(error?.code === 'NATIVE_AUTH_CALLBACK' ? 'NATIVE_AUTH_CALLBACK' : 'NATIVE_AUTH_EXCHANGE')
        };
    }
    await clearPending(adapter);
    await closeBrowser(adapter);
    await notify(adapter, result.error ? 'onError' : 'onComplete', result.error || result.data);
    return result;
}

/** Register before showing auth UI. The returned disposer removes only owned listeners. */
export async function registerNativeAuthCallbacks(auth, adapter = {}) {
    const handles = [];
    let stopped = false;
    let consuming = false;
    let lastCode = null;
    let queue = Promise.resolve();
    const handleUrl = ({ url } = {}) => {
        queue = queue.then(async () => {
            if (stopped) return;
            const parsed = parseNativeAuthCallback(url);
            if (!parsed || (parsed.type === 'code' && parsed.code === lastCode)) return;
            if (parsed.type === 'code') lastCode = parsed.code;
            consuming = true;
            try {
                await consumeNativeAuthCallback(auth, url, adapter);
            } finally {
                consuming = false;
            }
        });
        return queue;
    };
    const dispose = async () => {
        stopped = true;
        lastCode = null;
        await Promise.allSettled(handles.map((handle) => handle.remove()));
    };
    try {
        const app = adapter.app || (await import('@capacitor/app')).App;
        const browser = await getBrowser(adapter);
        handles.push(await app.addListener('appUrlOpen', handleUrl));
        if (browser.addListener) {
            handles.push(await browser.addListener('browserFinished', async () => {
                try {
                    if (stopped || consuming || !(await adapter.getPending?.())) return;
                    const result = await cancelNativeOAuth(adapter);
                    if (result.error) await notify(adapter, 'onError', result.error);
                } catch {
                    await notify(adapter, 'onError', authError('NATIVE_AUTH_LISTENER'));
                }
            }));
        }
        const launch = await app.getLaunchUrl?.();
        if (launch?.url) await handleUrl(launch);
        return dispose;
    } catch {
        await dispose();
        throw authError('NATIVE_AUTH_LISTENER');
    }
}
