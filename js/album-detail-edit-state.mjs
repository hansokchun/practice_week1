export function getAlbumPhotoIdsAfterRemoval(photos = [], removedPhotoId, removedPhotoIndex = null) {
    const targetId = removedPhotoId == null ? '' : String(removedPhotoId);
    const hasIndexInput = removedPhotoIndex !== null && removedPhotoIndex !== undefined && removedPhotoIndex !== '';
    const targetIndex = Number(removedPhotoIndex);
    const hasTargetIndex = hasIndexInput && Number.isInteger(targetIndex) && targetIndex >= 0 && targetIndex < photos.length;
    const hasIdMatch = targetId && photos.some((photo) => String(photo?.id ?? photo?.localId ?? '') === targetId);

    return photos
        .filter((photo, index) => {
            if (hasIdMatch) return String(photo?.id ?? photo?.localId ?? '') !== targetId;
            if (hasTargetIndex) return index !== targetIndex;
            return true;
        })
        .map((photo) => photo?.id || photo?.localId)
        .filter(Boolean);
}

export function getAlbumPhotoRemovalTarget(photos = [], removedPhotoId, removedPhotoIndex = null) {
    const targetId = removedPhotoId == null ? '' : String(removedPhotoId);
    const idMatch = photos.find((photo) => String(photo?.id ?? photo?.localId ?? '') === targetId);
    if (idMatch?.id || idMatch?.localId) return idMatch.id || idMatch.localId;

    const hasIndexInput = removedPhotoIndex !== null && removedPhotoIndex !== undefined && removedPhotoIndex !== '';
    const targetIndex = Number(removedPhotoIndex);
    if (hasIndexInput && Number.isInteger(targetIndex) && targetIndex >= 0 && targetIndex < photos.length) {
        return photos[targetIndex]?.id || photos[targetIndex]?.localId || null;
    }
    return null;
}

export function shouldOpenAlbumDetailPhotoClick(target, { isEditing = false } = {}) {
    return !isEditing && !target?.closest?.('[data-remove-trip-photo]');
}
