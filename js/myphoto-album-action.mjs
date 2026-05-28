export function getMyphotoAlbumAction({ albumId = null, visibility = 'private', isDraft = false } = {}) {
    if (!isDraft && ['public', 'link'].includes(visibility) && albumId) {
        return {
            route: 'trip',
            albumId
        };
    }

    return {
        route: 'share',
        albumId: albumId || null
    };
}
