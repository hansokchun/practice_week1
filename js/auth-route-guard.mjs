const AUTH_REQUIRED_ROUTES = new Set(['upload', 'liked']);

export function getAuthRequiredRoute(route, currentUser) {
    return AUTH_REQUIRED_ROUTES.has(route) && !currentUser ? route : null;
}

export function takePendingAuthRoute(state) {
    const route = state.pendingAuthRoute || null;
    state.pendingAuthRoute = null;
    return route;
}
