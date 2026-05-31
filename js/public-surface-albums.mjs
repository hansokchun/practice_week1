export function getPublicSurfaceAlbums(page, publicAlbums = [], sampleAlbums = []) {
    if (page === 'explore' && sampleAlbums.length) return sampleAlbums;
    return publicAlbums.length ? publicAlbums : sampleAlbums;
}
