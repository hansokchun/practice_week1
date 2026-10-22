/** Load the official SDK with a bounded, retryable attempt. Never log keys/URLs. */
export function createGoogleMapsLoader({
    loadConfig,
    window = globalThis.window,
    document = globalThis.document,
    setTimer = globalThis.setTimeout,
    clearTimer = globalThis.clearTimeout,
    timeoutMs = 20000,
    onStatus
} = {}) {
    let pending = null;
    let rejectAttempt = null;
    let authFailed = false;
    let authHandlerInstalled = false;
    let sequence = 0;
    const report = code => { try { onStatus?.(code); } catch { /* Diagnostics cannot break maps. */ } };
    const failure = code => Object.assign(new Error('지도를 준비하지 못했습니다.'), { code });

    return function loadMaps() {
        if (!authHandlerInstalled) {
            authHandlerInstalled = true;
            const previous = window.gm_authFailure;
            window.gm_authFailure = () => {
                authFailed = true;
                if (rejectAttempt) rejectAttempt(failure('MAP_AUTH_ERROR'));
                else report('MAP_AUTH_ERROR');
                try { previous?.(); } catch { /* Keep provider errors out of UI/logs. */ }
            };
        }
        if (authFailed) return Promise.reject(failure('MAP_AUTH_ERROR'));
        if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
        if (pending) return pending;
        report('MAP_LOADING');
        pending = new Promise((resolve, reject) => {
            let settled = false;
            let script;
            const callbackName = `initIkkyeeGoogleMap${++sequence}`;
            const finish = (error, maps) => {
                if (settled) return;
                settled = true;
                clearTimer(timer);
                delete window[callbackName];
                rejectAttempt = null;
                pending = null;
                if (error) {
                    script?.remove();
                    report(error.code);
                    reject(error);
                } else {
                    report('MAP_READY');
                    resolve(maps);
                }
            };
            const timer = setTimer(() => finish(failure('MAP_TIMEOUT')), timeoutMs);
            rejectAttempt = error => finish(error);
            Promise.resolve().then(loadConfig).then(config => {
                if (settled) return;
                const apiKey = typeof config?.apiKey === 'string' ? config.apiKey.trim() : '';
                if (!apiKey) { finish(failure('MAP_CONFIG_ERROR')); return; }
                report('MAP_CONFIG_READY');
                window[callbackName] = () => {
                    if (!window.google?.maps?.Map) finish(failure('MAP_SCRIPT_ERROR'));
                    else finish(null, window.google.maps);
                };
                script = document.createElement('script');
                const url = new URL('https://maps.googleapis.com/maps/api/js');
                url.search = new URLSearchParams({ key: apiKey, libraries: 'places,marker', loading: 'async', callback: callbackName }).toString();
                script.src = url.href;
                script.async = true;
                script.defer = true;
                script.onerror = () => finish(failure('MAP_SCRIPT_ERROR'));
                document.head.appendChild(script);
            }).catch(() => finish(failure('MAP_CONFIG_ERROR')));
        });
        return pending;
    };
}
