const ERRORS = Object.freeze({
    RefererNotAllowedMapError: 'MAP_REFERER_NOT_ALLOWED',
    ApiNotActivatedMapError: 'MAP_API_DISABLED',
    ApiTargetBlockedMapError: 'MAP_API_BLOCKED',
    BillingNotEnabledMapError: 'MAP_BILLING_DISABLED',
    InvalidKeyMapError: 'MAP_KEY_INVALID',
    MissingKeyMapError: 'MAP_KEY_MISSING',
    ExpiredKeyMapError: 'MAP_KEY_EXPIRED',
    OverQuotaMapError: 'MAP_QUOTA_ERROR',
    ProjectDeniedMapError: 'MAP_PROJECT_DENIED',
    InvalidAppCheckTokenMapError: 'MAP_APP_CHECK_ERROR',
    RefererDeniedMapError: 'MAP_REFERER_DENIED'
});

/** Debug-only, allowlisted Maps errors. Never forward messages, keys or URLs. */
export function installNativeMapConsoleDiagnostics(target = globalThis.window) {
    if (typeof target?.IkkyeeBoot?.mark !== 'function' || !target.console) return () => {};
    const restorers = [];
    for (const level of ['error', 'warn']) {
        const original = target.console[level];
        if (typeof original !== 'function') continue;
        const wrapped = function (...args) {
            try {
                for (const value of args) {
                    if (typeof value !== 'string') continue;
                    for (const token of value.slice(0, 4096).match(/\b[A-Za-z]+MapError\b/g) || []) {
                        if (Object.hasOwn(ERRORS, token)) target.IkkyeeBoot.mark(ERRORS[token]);
                    }
                }
            } catch { /* Diagnostics must not suppress the original console call. */ }
            return original.apply(target.console, args);
        };
        target.console[level] = wrapped;
        restorers.push(() => { if (target.console[level] === wrapped) target.console[level] = original; });
    }
    return () => restorers.forEach(restore => restore());
}
