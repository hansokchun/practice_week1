function getPhotoId(photo) {
    return String(photo?.id || photo?.localId || '');
}

function isPublicPhoto(photo) {
    return Boolean(photo?.shared || photo?.visibility === 'public');
}

export function getLandingAdminPhotoCandidates(photos = [], likedPhotoIds = []) {
    const likedIds = new Set((likedPhotoIds || []).map(String));
    const seenIds = new Set();

    return (photos || []).filter((photo) => {
        const photoId = getPhotoId(photo);
        if (!photoId || seenIds.has(photoId) || !likedIds.has(photoId) || !isPublicPhoto(photo)) return false;
        seenIds.add(photoId);
        return true;
    });
}

export function getLandingAdminSelectedPhotoIds(selectedPhotoIds = [], candidates = [], limit = 20) {
    const candidateIds = new Set((candidates || []).map(getPhotoId).filter(Boolean));
    const seenIds = new Set();
    const maxCount = Math.max(0, Math.trunc(Number(limit) || 0));

    return (selectedPhotoIds || [])
        .map(String)
        .filter((photoId) => {
            if (!candidateIds.has(photoId) || seenIds.has(photoId)) return false;
            seenIds.add(photoId);
            return true;
        })
        .slice(0, maxCount);
}
