function hasCoordinate(value) {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

export function combinePublicAlbumsWithDemoEntries(publicAlbums = [], demoEntries = []) {
    const locatedPhotoCount = publicAlbums.reduce((count, album) => (
        count + (album.photos || []).filter((photo) => hasCoordinate(photo.lat) && hasCoordinate(photo.lng)).length
    ), 0);

    if (!publicAlbums.length) return demoEntries;
    if (locatedPhotoCount > 0) return publicAlbums;

    const existingIds = new Set(publicAlbums.map((album) => album.id));
    return [
        ...publicAlbums,
        ...demoEntries.filter((album) => !existingIds.has(album.id))
    ];
}
