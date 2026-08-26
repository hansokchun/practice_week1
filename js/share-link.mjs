export function buildAlbumRouteHash(route, albumId) {
    const path = String(route || 'trip').replace(/^#?\/*/, '').replace(/^\/+|\/+$/g, '') || 'trip';
    const hash = path === 'home' ? '#/' : `#/${path}`;
    if (!albumId) return hash;
    return `${hash}?album=${encodeURIComponent(albumId)}`;
}

export function buildTripHash(albumId) {
    return buildAlbumRouteHash('trip', albumId);
}

export function buildOwnerProfileHash(ownerId) {
    if (!ownerId) return '#/profile';
    return `#/profile?owner=${encodeURIComponent(ownerId)}`;
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

export function parseSharedOwnerId(hash) {
    const query = String(hash || '').split('?')[1];
    if (!query) return null;
    const params = new URLSearchParams(query);
    return params.get('owner');
}

export function getSharedRouteState(hash) {
    const path = String(hash || '').replace(/^#\//, '').split('?')[0].replace(/^\/+|\/+$/g, '');
    const route = ['landing', 'home', 'myphoto', 'explore', 'upload', 'photos', 'liked', 'album', 'album-photos', 'trip', 'profile', 'admin-landing'].includes(path)
        ? path || 'home'
        : 'home';
    return {
        route: route === 'myphoto' ? 'home' : route || 'home',
        albumId: parseSharedAlbumId(hash),
        ownerId: parseSharedOwnerId(hash)
    };
}
