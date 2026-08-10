export function getProfileHeroImage(selectedAlbum = {}, profileAlbums = [], fallbackUrl = '') {
    return selectedAlbum?.cover_url || profileAlbums.find((album) => album.cover_url)?.cover_url || fallbackUrl;
}
