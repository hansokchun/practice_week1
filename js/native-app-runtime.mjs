const NATIVE_API_ORIGINS = Object.freeze({
    production: 'https://ikkyee.com',
    preview: 'https://dev.practice-week1-cws.pages.dev'
});

export function isNativeApp(capacitor = globalThis.Capacitor) {
    try {
        return typeof capacitor?.isNativePlatform === 'function' && capacitor.isNativePlatform() === true;
    } catch {
        return false;
    }
}

export function getNativeApiOrigin(environment = 'production') {
    if (!Object.hasOwn(NATIVE_API_ORIGINS, environment)) {
        throw new TypeError('Unsupported native API environment.');
    }
    return NATIVE_API_ORIGINS[environment];
}

export function resolveNativeApiUrl(path, {
    capacitor = globalThis.Capacitor,
    environment = 'production'
} = {}) {
    const origin = getNativeApiOrigin(environment);
    const invalid = () => new TypeError('Expected a relative /api/ API path.');
    if (typeof path !== 'string' || !path.startsWith('/api/')
        || /[\\\s\u0000-\u001f\u007f#]/u.test(path)) {
        throw invalid();
    }
    const pathname = path.split('?')[0];
    if (/%(?:2f|5c)/i.test(pathname)) throw invalid();
    let decodedPath;
    try {
        decodedPath = decodeURIComponent(pathname);
    } catch {
        throw invalid();
    }
    if (decodedPath.split('/').some(segment => segment === '.' || segment === '..')
        || /[\\\u0000-\u001f\u007f]/u.test(decodedPath)) {
        throw invalid();
    }
    const resolved = new URL(path, origin);
    if (resolved.origin !== origin || !resolved.pathname.startsWith('/api/')) throw invalid();
    return isNativeApp(capacitor) ? resolved.href : path;
}

function getNativePlatform(capacitor) {
    try {
        const platform = capacitor?.getPlatform?.();
        return platform === 'android' || platform === 'ios' ? platform : 'native';
    } catch {
        return 'native';
    }
}

async function loadDefaultAppPlugin() {
    const { App } = await import('@capacitor/app');
    return App;
}

function dispatchExitRequest(window, platform) {
    if (typeof window?.CustomEvent === 'function') {
        window.dispatchEvent?.(new window.CustomEvent('ikkyee:native-exit-request', {
            cancelable: true,
            detail: { platform }
        }));
    }
    // The event requests a confirmation UI. Dispatching it is never confirmation.
    return false;
}

/**
 * Native platform wiring only; existing app modal/route behavior is injected.
 * Hash history is bounded to navigation observed after this runtime starts, so
 * a WebView's unrelated history cannot navigate out of the bundled application.
 */
export async function bindNativeAppRuntime({
    capacitor = globalThis.Capacitor,
    window = globalThis.window,
    document = globalThis.document,
    appPlugin,
    loadAppPlugin = loadDefaultAppPlugin,
    closeTopModal,
    canGoBack,
    navigateBack,
    navigateRoot,
    requestExit,
    rootHash = '#/landing',
    rootHashes = ['', '#/', '#/landing'],
    onError
} = {}) {
    if (!isNativeApp(capacitor)) {
        return { native: false, platform: 'web', backButtonBound: false,
            handleBackButton: async () => {}, dispose: async () => {} };
    }

    const platform = getNativePlatform(capacitor);
    const root = document?.documentElement;
    const classes = ['native-app', `native-${platform}`];
    const ownedClasses = classes.filter(name => !root?.classList?.contains?.(name));
    const previousPlatform = root?.getAttribute?.('data-native-platform') ?? null;
    root?.classList?.add(...classes);
    root?.setAttribute?.('data-native-platform', platform);

    let disposed = false;
    let handlingBack = false;
    let pendingBack = null;
    let resetOnHashChange = false;
    let listener;
    let plugin = appPlugin;
    const routeHistory = [window?.location?.hash || ''];
    const handleHashChange = (event = {}) => {
        const next = window?.location?.hash || '';
        if (resetOnHashChange) {
            routeHistory.splice(0, routeHistory.length, next);
            resetOnHashChange = false;
            pendingBack = null;
            return;
        }
        if (pendingBack) {
            if (routeHistory.length > 1 && pendingBack.hash === next) routeHistory.pop();
            else routeHistory.splice(0, routeHistory.length, next);
            pendingBack = null;
            return;
        }
        // replaceState does not emit hashchange; the next event exposes the
        // actual previous route. Reconcile it without trusting history.length.
        if (typeof event.oldURL === 'string') {
            try {
                const previous = new URL(event.oldURL).hash;
                routeHistory[routeHistory.length - 1] = previous;
            } catch {
                // A malformed synthetic event cannot add an outside URL.
            }
        }
        if (routeHistory.at(-1) === next) return;
        routeHistory.push(next);
    };
    window?.addEventListener?.('hashchange', handleHashChange);

    const handleBackButton = async () => {
        if (disposed || handlingBack || platform !== 'android') return;
        handlingBack = true;
        try {
            if (typeof closeTopModal === 'function' && await closeTopModal()) return;
            if (disposed || pendingBack) return;
            const hash = window?.location?.hash || '';
            if (routeHistory.at(-1) !== hash) routeHistory[routeHistory.length - 1] = hash;
            const hasPreviousRoute = typeof canGoBack === 'function'
                ? await canGoBack() === true
                : routeHistory.length > 1;
            if (disposed) return;
            if (hasPreviousRoute) {
                pendingBack = { hash: routeHistory.at(-2) };
                try {
                    if (typeof navigateBack === 'function') await navigateBack();
                    else if (typeof window?.history?.back === 'function') window.history.back();
                    else pendingBack = null;
                } catch (error) {
                    pendingBack = null;
                    throw error;
                }
                return;
            }
            if (!rootHashes.includes(hash)) {
                resetOnHashChange = true;
                try {
                    if (typeof navigateRoot === 'function') await navigateRoot();
                    else if (window?.location) window.location.hash = rootHash;
                } catch (error) {
                    resetOnHashChange = false;
                    throw error;
                }
                return;
            }
            const confirmed = typeof requestExit === 'function'
                ? await requestExit({ platform })
                : dispatchExitRequest(window, platform);
            if (confirmed === true && !disposed) await plugin?.exitApp?.();
        } finally {
            handlingBack = false;
        }
    };

    if (platform === 'android') {
        try {
            if (plugin === undefined) plugin = await loadAppPlugin();
            if (typeof plugin?.addListener === 'function') {
                listener = await plugin.addListener('backButton', () => {
                    void handleBackButton().catch(error => onError?.(error));
                });
            }
        } catch (error) {
            onError?.(error);
        }
    }

    return {
        native: true,
        platform,
        backButtonBound: Boolean(listener),
        handleBackButton,
        dispose: async () => {
            if (disposed) return;
            disposed = true;
            window?.removeEventListener?.('hashchange', handleHashChange);
            root?.classList?.remove(...ownedClasses);
            if (previousPlatform === null) root?.removeAttribute?.('data-native-platform');
            else root?.setAttribute?.('data-native-platform', previousPlatform);
            await listener?.remove?.();
        }
    };
}
