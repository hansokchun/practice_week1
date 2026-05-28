export function getTravelDraftPhotos({ staged = [], saved = [], demos = [] } = {}) {
    if (staged.length) return staged;
    if (saved.length) return saved;
    return [];
}

export function getTravelDraftPhotoIds({ lastSavedPhotoIds = [], saved = [] } = {}) {
    if (lastSavedPhotoIds.length) return lastSavedPhotoIds;
    return saved.map((photo) => photo.id).filter(Boolean);
}

export function getDraftPhotoCount({ staged = [], saved = [], demos = [] } = {}) {
    return getTravelDraftPhotos({ staged, saved, demos }).length;
}
