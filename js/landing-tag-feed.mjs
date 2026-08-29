export const LANDING_TAG_PAGE_SIZE = 30;
export const LANDING_TAG_PIN_LIMIT = 20;

const KOREA_COUNTRY_LABELS = new Set(['대한민국', '한국', '대한민국한국']);

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

function formatRegionLabel(value) {
    return String(value || '')
        .trim()
        .replace(/(?:특별자치도|특별자치시|특별시|광역시|자치도|도)$/u, '')
        .trim();
}

export function getLandingTagPhotoRegion(photo = {}) {
    const explicitLocalRegion = photo.city || photo.region || photo.state;
    if (explicitLocalRegion) return formatRegionLabel(explicitLocalRegion);

    const parts = String(photo.placeName || '')
        .split(/[\s,·/]+/u)
        .map((part) => part.trim())
        .filter(Boolean);
    if (!parts.length) return formatRegionLabel(photo.country);
    const first = formatRegionLabel(parts[0]);
    if (KOREA_COUNTRY_LABELS.has(parts[0]) && parts[1]) return formatRegionLabel(parts[1]);
    return formatRegionLabel(photo.country) || first;
}

export function getLandingTagRegions(photos = []) {
    const counts = new Map();
    photos.forEach((photo) => {
        const label = getLandingTagPhotoRegion(photo);
        if (label) counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [...counts.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((left, right) => left.label.localeCompare(right.label, 'ko-KR'));
}

export function filterLandingTagPhotosByRegion(photos = [], region = '') {
    const normalizedRegion = String(region || '').trim();
    if (!normalizedRegion) return [...photos];
    return photos.filter((photo) => getLandingTagPhotoRegion(photo) === normalizedRegion);
}

export function getLandingTagPhotoPage(photos = [], requestedPage = 1, pageSize = LANDING_TAG_PAGE_SIZE) {
    const normalizedPageSize = Math.max(1, Math.floor(Number(pageSize) || LANDING_TAG_PAGE_SIZE));
    const pageCount = Math.max(1, Math.ceil(photos.length / normalizedPageSize));
    const page = Math.min(pageCount, Math.max(1, Math.floor(Number(requestedPage) || 1)));
    const start = (page - 1) * normalizedPageSize;
    return {
        items: photos.slice(start, start + normalizedPageSize),
        page,
        pageCount,
        total: photos.length,
        hasPrevious: page > 1,
        hasNext: page < pageCount
    };
}
