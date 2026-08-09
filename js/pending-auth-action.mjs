const SUPPORTED_ACTIONS = new Set(['persist-upload', 'save-share', 'save-album']);
const SUPPORTED_PENDING_ROUTES = new Set(['upload']);
const STORAGE_KEY = 'ikkyee.pendingAuth';

export function createPendingAuthState() {
    return {
        pendingAuthAction: null,
        pendingAuthRoute: null
    };
}

export function setPendingAuthAction(state, action) {
    if (!SUPPORTED_ACTIONS.has(action)) {
        state.pendingAuthAction = null;
        return null;
    }
    state.pendingAuthAction = action;
    return action;
}

export function getPendingAuthAction(state) {
    return SUPPORTED_ACTIONS.has(state.pendingAuthAction) ? state.pendingAuthAction : null;
}

export function takePendingAuthAction(state) {
    const action = getPendingAuthAction(state);
    state.pendingAuthAction = null;
    return action;
}

export function storePendingAuthContext(storage, state, context = {}) {
    const action = getPendingAuthAction(state);
    const pendingRoute = SUPPORTED_PENDING_ROUTES.has(state.pendingAuthRoute) ? state.pendingAuthRoute : null;
    const route = typeof context.route === 'string' ? context.route : null;
    if (!storage || (!action && !pendingRoute && !route)) return null;
    const payload = {
        action,
        route,
        visibility: context.visibility || null,
        albumId: context.albumId || null,
        pendingRoute
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return payload;
}

export function restorePendingAuthContext(storage, state) {
    if (!storage) return null;
    const raw = storage.getItem(STORAGE_KEY);
    storage.removeItem(STORAGE_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        const action = SUPPORTED_ACTIONS.has(parsed?.action) ? parsed.action : null;
        const pendingRoute = SUPPORTED_PENDING_ROUTES.has(parsed?.pendingRoute) ? parsed.pendingRoute : null;
        const route = typeof parsed?.route === 'string' ? parsed.route : null;
        if (!action && !pendingRoute && !route) return null;
        state.pendingAuthAction = action;
        state.pendingAuthRoute = pendingRoute;
        return {
            action,
            route,
            visibility: ['private', 'link', 'public'].includes(parsed.visibility) ? parsed.visibility : null,
            albumId: typeof parsed.albumId === 'string' ? parsed.albumId : null,
            pendingRoute
        };
    } catch {
        return null;
    }
}
