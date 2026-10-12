export function getAlbumCoverCandidates(album = {}, photos = [], userId = '') {
    if (!userId || album.owner_id !== userId || !album.id) return [];
    return photos.filter(photo => photo.id && photo.owner_id === userId && (
        String(photo.album_id || '') === String(album.id)
        || (!photo.album_id && album.title && photo.album === album.title)
    )).map(photo => ({ ...photo, coverSelectable: album.visibility === 'private' || photo.visibility === 'public' }));
}

export function getAlbumCoverSelection(album, photos, userId, selectedId) {
    return getAlbumCoverCandidates(album, photos, userId)
        .find(photo => String(photo.id) === String(selectedId) && photo.coverSelectable) || null;
}
