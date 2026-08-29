export const LANDING_TAG_BATCH_SIZE = 20;
export const LANDING_TAG_PIN_LIMIT = 20;

function normalizeText(value) {
    return String(value ?? '').trim().toLocaleLowerCase('ko-KR');
}

function isPublicPhoto(photo) {
    return Boolean(photo?.shared || photo?.visibility === 'public');
}

function getPhotoSearchText(photo) {
    return [
        photo?.title,
        photo?.description,
        photo?.placeName,
        photo?.album,
        ...(Array.isArray(photo?.tags) ? photo.tags : [photo?.tags])
    ].map(normalizeText).filter(Boolean).join(' ');
}

function getSectionKeywords(section) {
    return [section?.title, ...(Array.isArray(section?.keywords) ? section.keywords : [])]
        .map(normalizeText)
        .filter(Boolean);
}

function getStableShuffleScore(seed, id) {
    const text = `${seed}:${id}`;
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function getLandingTagFeedPhotos(section, photos = [], seed = '') {
    const publicPhotos = photos.filter(isPublicPhoto);
    const photoById = new Map(publicPhotos.map((photo) => [String(photo.id || photo.localId || ''), photo]));
    const curatedIds = [...new Set((section?.photo_ids || []).map(String).filter(Boolean))];
    const pinnedIds = curatedIds.slice(0, LANDING_TAG_PIN_LIMIT);
    const pinnedIdSet = new Set(pinnedIds);
    const curatedIdSet = new Set(curatedIds);
    const keywords = getSectionKeywords(section);
    const candidates = publicPhotos.filter((photo) => {
        const id = String(photo.id || photo.localId || '');
        if (curatedIdSet.has(id)) return true;
        const searchText = getPhotoSearchText(photo);
        return keywords.some((keyword) => searchText.includes(keyword));
    });
    const pinned = pinnedIds.map((id) => photoById.get(id)).filter(Boolean);
    const feedCandidates = candidates.length ? candidates : publicPhotos;
    const shuffled = feedCandidates
        .filter((photo) => !pinnedIdSet.has(String(photo.id || photo.localId || '')))
        .sort((left, right) => {
            const leftId = String(left.id || left.localId || '');
            const rightId = String(right.id || right.localId || '');
            return getStableShuffleScore(seed, leftId) - getStableShuffleScore(seed, rightId)
                || leftId.localeCompare(rightId);
        });
    return [...pinned, ...shuffled];
}

export function getLandingTagVisiblePhotos(photos = [], visibleCount = LANDING_TAG_BATCH_SIZE) {
    const count = Math.max(LANDING_TAG_BATCH_SIZE, Number(visibleCount) || 0);
    return photos.slice(0, count);
}
