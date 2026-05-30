export function getAlbumPhotoIdsAfterRemoval(photos = [], removedPhotoId) {
    const targetId = removedPhotoId == null ? '' : String(removedPhotoId);
    return photos
        .map((photo) => photo?.id)
        .filter((id) => id && String(id) !== targetId);
}

export function shouldOpenAlbumDetailPhotoClick(target, { isEditing = false } = {}) {
    return !isEditing && !target?.closest?.('[data-remove-trip-photo]');
}
