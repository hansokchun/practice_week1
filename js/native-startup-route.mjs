// Native apps have no marketing entry screen. Keep web routing unchanged.
export function normalizeNativeRoute(route, native = false) {
    return native && (!route || route === 'landing') ? 'home' : route;
}
