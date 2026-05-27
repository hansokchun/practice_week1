const SUPPORTED_ACTIONS = new Set(['persist-upload', 'save-share']);

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
