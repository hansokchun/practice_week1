const SUPPORTED_ACTIONS = new Set(['persist-upload', 'save-share', 'save-album', 'save-photo-trial', 'persist-photo-trial']);
const SUPPORTED_PENDING_ROUTES = new Set(['upload']);
const STORAGE_KEY = 'ikkyee.pendingAuth';
const PENDING_AUTH_TTL_MS = 15 * 60 * 1000;
const PHOTO_TRIAL_AUTH_TTL_MS = 24 * 60 * 60 * 1000;

function normalizeTrialIds(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter(id => (
        typeof id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(id)
    )))].slice(0, 3);
}

export function createPendingAuthState() {
    return {
        pendingAuthAction: null,
        pendingAuthRoute: null,
        pendingAuthReturnRoute: null
    };
}

export function setPendingAuthReturnRoute(state, route) {
    state.pendingAuthReturnRoute = typeof route === 'string' && route ? route : null;
    return state.pendingAuthReturnRoute;
}

export function takePendingAuthReturnRoute(state) {
    const route = typeof state.pendingAuthReturnRoute === 'string' && state.pendingAuthReturnRoute
        ? state.pendingAuthReturnRoute
        : null;
    state.pendingAuthReturnRoute = null;
    return route;
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

export function storePendingAuthContext(storage, state, context = {}, now = Date.now()) {
    const action = getPendingAuthAction(state);
    const pendingRoute = SUPPORTED_PENDING_ROUTES.has(state.pendingAuthRoute) ? state.pendingAuthRoute : null;
    const route = typeof context.route === 'string' ? context.route : null;
    if (!storage || (!action && !pendingRoute && !route)) return null;
    const payload = {
        action,
        route,
        visibility: context.visibility || null,
        albumId: context.albumId || null,
        pendingRoute,
        createdAt: now
    };
    if (action === 'persist-photo-trial') {
        payload.trialIds = normalizeTrialIds(context.trialIds ?? state.pendingPhotoTrialIds);
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return payload;
}

export function clearPendingAuthContext(storage) {
    storage?.removeItem(STORAGE_KEY);
}

export function restorePendingAuthContext(storage, state, now = Date.now(), { consume = true } = {}) {
    if (!storage) return null;
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        const action = SUPPORTED_ACTIONS.has(parsed?.action) ? parsed.action : null;
        const ttl = action === 'persist-photo-trial' ? PHOTO_TRIAL_AUTH_TTL_MS : PENDING_AUTH_TTL_MS;
        const isFresh = Number.isFinite(parsed?.createdAt)
            && now - parsed.createdAt >= 0
            && now - parsed.createdAt <= ttl;
        if (!isFresh) {
            clearPendingAuthContext(storage);
            return null;
        }
        const pendingRoute = SUPPORTED_PENDING_ROUTES.has(parsed?.pendingRoute) ? parsed.pendingRoute : null;
        const route = typeof parsed?.route === 'string' ? parsed.route : null;
        if (!action && !pendingRoute && !route) {
            clearPendingAuthContext(storage);
            return null;
        }
        if (consume) clearPendingAuthContext(storage);
        state.pendingAuthAction = action;
        state.pendingAuthRoute = pendingRoute;
        state.pendingAuthReturnRoute = route;
        const context = {
            action,
            route,
            visibility: ['private', 'link', 'public'].includes(parsed.visibility) ? parsed.visibility : null,
            albumId: typeof parsed.albumId === 'string' ? parsed.albumId : null,
            pendingRoute
        };
        if (action === 'persist-photo-trial') {
            state.pendingPhotoTrialIds = normalizeTrialIds(parsed.trialIds);
            context.trialIds = [...state.pendingPhotoTrialIds];
        }
        return context;
    } catch {
        clearPendingAuthContext(storage);
        return null;
    }
}
