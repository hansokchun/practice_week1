const AUTH_REQUIRED_ROUTES = new Set(['upload', 'upload-complete', 'location-assign', 'liked', 'settings']);

export function getAuthRequiredRoute(route, currentUser, options = {}) {
    if (route === 'upload' && options?.hasGuestPhotoTrial === true) return null;
    return AUTH_REQUIRED_ROUTES.has(route) && !currentUser ? route : null;
}

export function takePendingAuthRoute(state) {
    const route = state.pendingAuthRoute || null;
    state.pendingAuthRoute = null;
    return route;
}
