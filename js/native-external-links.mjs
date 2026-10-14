import { isNativeApp } from './native-app-runtime.mjs';

const PUBLIC_ORIGIN = 'https://ikkyee.com';
const POLICY_PATHS = new Set(['/privacy/', '/support/', '/account-deletion/']);
const CREDENTIAL_KEYS = /^(?:access_token|refresh_token|id_token|token|token_hash|code|password|secret|authorization|api_?key)$/i;
const OPEN_ERROR = '외부 페이지를 열지 못했어요. 다시 시도해 주세요.';

async function loadDefaultBrowser() {
    const { Browser } = await import('@capacitor/browser');
    return Browser;
}

function validMapCoordinates(value) {
    if (typeof value !== 'string' || !/^-?(?:\d+(?:\.\d*)?|\.\d+),-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return false;
    const [lat, lng] = value.split(',').map(Number);
    return Number.isFinite(lat) && lat >= -90 && lat <= 90
        && Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

function resolveLink(href, baseURI) {
    if (typeof href !== 'string' || !href || href.startsWith('#')) return { kind: 'ignore' };
    if (href.length > 4096 || /[\\\s\u0000-\u001f\u007f]/.test(href)
        || /%(?:2e|2f|5c)/i.test(href.split('?')[0])) return { kind: 'refuse' };

    let url;
    let base;
    try {
        base = new URL(baseURI || 'https://localhost/index.html');
        url = new URL(href, base);
    } catch {
        return { kind: 'refuse' };
    }
    if (url.username || url.password || url.port
        || [...url.searchParams.keys()].some(key => CREDENTIAL_KEYS.test(key))) return { kind: 'refuse' };

    const local = base.hostname === 'localhost' && ['https:', 'capacitor:'].includes(base.protocol)
        && url.protocol === base.protocol && url.hostname === base.hostname && url.port === base.port;
    const publicPolicy = url.origin === PUBLIC_ORIGIN;
    if ((local || publicPolicy) && POLICY_PATHS.has(url.pathname)) {
        if (url.search || (url.hash && !(url.pathname === '/privacy/' && url.hash === '#analytics'))) return { kind: 'refuse' };
        return { kind: 'open', url: `${PUBLIC_ORIGIN}${url.pathname}${url.hash}` };
    }

    if (url.protocol === 'https:' && url.hostname === 'www.google.com'
        && url.pathname === '/maps/search/' && !url.hash
        && url.searchParams.size === 2 && url.searchParams.getAll('api').length === 1
        && url.searchParams.get('api') === '1' && url.searchParams.getAll('query').length === 1
        && validMapCoordinates(url.searchParams.get('query'))) {
        return { kind: 'open', url: url.href };
    }

    if (local && !/^\/auth(?:\/|$)/.test(url.pathname)) return { kind: 'ignore' };
    return { kind: 'refuse' };
}

/** Only approved policy pages and photo-coordinate Maps links leave the native app. */
export function bindNativeExternalLinks({
    capacitor = globalThis.Capacitor,
    document = globalThis.document,
    loadBrowser = loadDefaultBrowser,
    onError
} = {}) {
    if (!isNativeApp(capacitor) || typeof document?.addEventListener !== 'function') return () => {};
    let disposed = false;
    const reportError = () => {
        if (!disposed) void Promise.resolve().then(() => onError?.(new Error(OPEN_ERROR))).catch(() => {});
    };
    const handleClick = event => {
        if (disposed || event.defaultPrevented || (event.button !== undefined && event.button !== 0)
            || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        const target = event.target?.closest ? event.target : event.target?.parentElement;
        const anchor = target?.closest?.('a[href]');
        if (!anchor || anchor.hasAttribute?.('download')
            || anchor.getAttribute?.('aria-disabled') === 'true'
            || anchor.closest?.('[aria-disabled="true"]')) return;
        const result = resolveLink(anchor.getAttribute('href'), document.baseURI);
        if (result.kind === 'ignore') return;
        // Stop WebView navigation synchronously, before a plugin can be loaded.
        event.preventDefault();
        if (result.kind === 'refuse') { reportError(); return; }
        void (async () => {
            try {
                const browser = await loadBrowser();
                if (!disposed) await browser.open({ url: result.url });
            } catch {
                reportError();
            }
        })();
    };
    document.addEventListener('click', handleClick);
    return () => {
        if (disposed) return;
        disposed = true;
        document.removeEventListener('click', handleClick);
    };
}
