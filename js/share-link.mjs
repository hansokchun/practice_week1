export function buildTripHash(albumId) {
    if (!albumId) return '#/trip';
    return `#/trip?album=${encodeURIComponent(albumId)}`;
}

export function buildTripShareUrl(origin, albumId) {
    const base = String(origin || '').replace(/\/+$/, '');
    return `${base}/${buildTripHash(albumId)}`;
}

export function parseSharedAlbumId(hash) {
    const query = String(hash || '').split('?')[1];
    if (!query) return null;
    const params = new URLSearchParams(query);
    return params.get('album');
}

export function getSharedRouteState(hash) {
    const path = String(hash || '').replace(/^#\//, '').split('?')[0].replace(/^\/+|\/+$/g, '');
    const route = ['home', 'myphoto', 'explore', 'upload', 'album', 'review', 'share', 'trip', 'profile'].includes(path)
        ? path || 'home'
        : 'home';
    return {
        route: route || 'home',
        albumId: parseSharedAlbumId(hash)
    };
}
