export function getAlbumEditorPhotoIds(album = null, savedPhotos = []) {
    const attachedIds = (album?.photos || [])
        .map((photo) => photo?.id)
        .filter(Boolean);
    if (attachedIds.length) return [...new Set(attachedIds)];

    const albumId = album?.id;
    const albumTitle = album?.title;
    return [...new Set(savedPhotos
        .filter((photo) => (
            (albumId && photo?.album_id === albumId)
            || (albumTitle && photo?.album === albumTitle)
        ))
        .map((photo) => photo.id)
        .filter(Boolean))];
}

export function getAlbumEditorPhotos(photoIds = [], savedPhotos = []) {
    const byId = new Map(savedPhotos.map((photo) => [photo.id, photo]));
    return photoIds.map((id) => byId.get(id)).filter(Boolean);
}
