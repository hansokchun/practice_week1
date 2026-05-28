export function getProfileHeroImage(selectedAlbum = {}, profileAlbums = []) {
    return selectedAlbum?.cover_url || profileAlbums.find((album) => album.cover_url)?.cover_url || 'images/main_bg4.jpg';
}
