export function selectAlbumForSharing(albums = [], ownerId, draftTitle = '') {
    const owned = albums.filter((album) => album.owner_id === ownerId);
    if (!owned.length) return null;
    const normalizedTitle = draftTitle.trim().toLowerCase();
    if (normalizedTitle) {
        const matching = owned.find((album) => String(album.title || '').trim().toLowerCase() === normalizedTitle);
        if (matching) return matching;
    }
    return owned[0] || null;
}
