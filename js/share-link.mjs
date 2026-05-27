export function buildTripShareUrl(origin, albumId) {
    const base = String(origin || '').replace(/\/+$/, '');
    if (!albumId) return `${base}/#/trip`;
    return `${base}/#/trip?album=${encodeURIComponent(albumId)}`;
}

export function parseSharedAlbumId(hash) {
    const query = String(hash || '').split('?')[1];
    if (!query) return null;
    const params = new URLSearchParams(query);
    return params.get('album');
}
