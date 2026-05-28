export function getMyphotoAlbumAction({ albumId = null, visibility = 'private', isDraft = false } = {}) {
    if (!isDraft && albumId) {
        return {
            route: 'trip',
            albumId
        };
    }

    return {
        route: 'album',
        albumId: albumId || null
    };
}
