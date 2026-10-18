const STAGES = new Set(['MODULE_READY', 'BOOT_START', 'EVENTS_READY', 'RUNTIME_READY',
    'AUTH_READY', 'SESSION_READY', 'PROFILE_READY', 'DATA_READY', 'BOOT_COMPLETE', 'BOOT_ERROR',
    'MAP_LOADING', 'MAP_CONFIG_READY', 'MAP_READY', 'MAP_AUTH_ERROR', 'MAP_CONFIG_ERROR', 'MAP_SCRIPT_ERROR', 'MAP_TIMEOUT']);

// The Android bridge exists only in debug builds and accepts no free-form data.
export function markNativeBoot(stage, target = globalThis.window) {
    if (!STAGES.has(stage)) return;
    try { target?.IkkyeeBoot?.mark(stage); } catch { /* Diagnostics never block boot. */ }
    if (stage === 'EVENTS_READY') {
        try {
            const app = target?.Capacitor?.PluginHeaders?.find(header => header.name === 'App');
            target?.IkkyeeBoot?.bridgeState(Boolean(app), Boolean(app?.methods?.some(method => method.name === 'addListener')),
                typeof target?.Capacitor?.nativeCallback === 'function');
        } catch { /* No raw native metadata is logged. */ }
    }
}
