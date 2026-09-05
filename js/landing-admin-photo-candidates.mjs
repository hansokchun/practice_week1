import { getLandingSearchResults } from './landing-sections.mjs';

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

export function getLandingAdminRandomPhotoIds(
    section,
    candidates = [],
    reservedPhotoIds = [],
    limit = 20,
    random = Math.random
) {
    const reservedIds = new Set((reservedPhotoIds || []).map(String));
    const title = String(section?.title || '').trim();
    const available = title === '추천'
        ? [...candidates]
        : getLandingSearchResults(candidates, title);
    const maxCount = Math.max(0, Math.trunc(Number(limit) || 0));

    return available
        .map((photo) => ({ id: getPhotoId(photo), score: Number(random()) || 0 }))
        .filter(({ id }) => id && !reservedIds.has(id))
        .sort((left, right) => left.score - right.score || left.id.localeCompare(right.id))
        .slice(0, maxCount)
        .map(({ id }) => id);
}
