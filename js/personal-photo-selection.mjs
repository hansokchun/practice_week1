export function togglePersonalPhotoSelection(selectedIds = [], photoId) {
    if (!photoId) return [...selectedIds];
    return selectedIds.includes(photoId)
        ? selectedIds.filter((id) => id !== photoId)
        : [...selectedIds, photoId];
}

export function prunePersonalPhotoSelection(selectedIds = [], photos = []) {
    const photoIds = new Set(photos.map((photo) => photo.id).filter(Boolean));
    return selectedIds.filter((id) => photoIds.has(id));
}

export function getSelectedPersonalPhotos(photos = [], selectedIds = []) {
    const selected = new Set(selectedIds);
    return photos.filter((photo) => selected.has(photo.id));
}

export function removeSelectedPersonalPhotos(photos = [], selectedIds = []) {
    const selected = new Set(selectedIds);
    return photos.filter((photo) => !selected.has(photo.id));
}
