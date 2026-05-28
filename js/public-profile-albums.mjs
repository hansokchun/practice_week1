export function getProfileAlbums(albums = [], selectedAlbum = null) {
    const ownerId = selectedAlbum?.owner_id;
    if (!ownerId) return albums;
    const ownerAlbums = albums.filter((album) => album.owner_id === ownerId);
    return ownerAlbums.length ? ownerAlbums : albums;
}

export function getProfileAlbumStats(albums = []) {
    return {
        albums: albums.length,
        photos: albums.reduce((sum, album) => sum + Number(album.photo_count || 0), 0),
        places: albums.reduce((sum, album) => sum + Number(album.places || 1), 0)
    };
}

export function getProfileMapCenter(albums = []) {
    const located = albums.filter((album) => Number.isFinite(Number(album.lat)) && Number.isFinite(Number(album.lng)));
    if (!located.length) return { lat: 36.45, lng: 127.85 };
    return {
        lat: located.reduce((sum, album) => sum + Number(album.lat), 0) / located.length,
        lng: located.reduce((sum, album) => sum + Number(album.lng), 0) / located.length
    };
}
