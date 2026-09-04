export function getProfileHeroImage(profileCoverUrl = '', selectedAlbum = {}, profileAlbums = [], fallbackUrl = '') {
    return profileCoverUrl
        || selectedAlbum?.cover_url
        || profileAlbums.find((album) => album.cover_url)?.cover_url
        || fallbackUrl;
}
