export function buildAlbumRouteHash(route, albumId) {
    const path = String(route || 'trip').replace(/^#?\/*/, '').replace(/^\/+|\/+$/g, '') || 'trip';
    const hash = path === 'home' ? '#/' : `#/${path}`;
    if (!albumId) return hash;
    return `${hash}?album=${encodeURIComponent(albumId)}`;
}

export function buildTripHash(albumId) {
    return buildAlbumRouteHash('trip', albumId);
}

export function buildTripShareUrl(origin, albumId) {
    const base = String(origin || '').replace(/\/+$/, '');
    return `${base}/${buildTripHash(albumId)}`;
}

export function getShareUrlAlbumId(selectedPublicAlbumId, selectedAlbum) {
    return selectedPublicAlbumId || selectedAlbum?.id || null;
}

export function parseSharedAlbumId(hash) {
    const query = String(hash || '').split('?')[1];
    if (!query) return null;
    const params = new URLSearchParams(query);
    return params.get('album');
}

export function getSharedRouteState(hash) {
    const path = String(hash || '').replace(/^#\//, '').split('?')[0].replace(/^\/+|\/+$/g, '');
    const route = ['home', 'myphoto', 'explore', 'upload', 'photos', 'album', 'trip', 'profile'].includes(path)
        ? path || 'home'
        : 'home';
    return {
        route: route || 'home',
        albumId: parseSharedAlbumId(hash)
    };
}
