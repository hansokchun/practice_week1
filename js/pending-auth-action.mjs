const SUPPORTED_ACTIONS = new Set(['persist-upload', 'save-share', 'save-album']);
const STORAGE_KEY = 'ikkyee.pendingAuth';

export function createPendingAuthState() {
    return {
        pendingAuthAction: null
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
    if (!storage || !action) return null;
    const payload = {
        action,
        route: context.route || null,
        visibility: context.visibility || null,
        albumId: context.albumId || null
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
        if (!SUPPORTED_ACTIONS.has(parsed?.action)) return null;
        state.pendingAuthAction = parsed.action;
        return {
            action: parsed.action,
            route: typeof parsed.route === 'string' ? parsed.route : null,
            visibility: ['private', 'link', 'public'].includes(parsed.visibility) ? parsed.visibility : null,
            albumId: typeof parsed.albumId === 'string' ? parsed.albumId : null
        };
    } catch {
        return null;
    }
}
