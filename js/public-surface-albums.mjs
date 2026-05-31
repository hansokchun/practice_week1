export function getPublicSurfaceAlbums(page, publicAlbums = [], sampleAlbums = []) {
    return publicAlbums.length ? publicAlbums : sampleAlbums;
}
