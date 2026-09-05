export const LANDING_TAG_PAGE_SIZE = 30;
export const LANDING_TAG_PIN_LIMIT = 20;

const KOREA_COUNTRY_LABELS = new Set(['대한민국', '한국', '대한민국한국']);

function isPublicPhoto(photo) {
    return Boolean(photo?.shared || photo?.visibility === 'public');
}

export function getLandingTagFeedPhotos(section, photos = [], seed = '') {
    void seed;
    const publicPhotos = photos.filter(isPublicPhoto);
    const photoById = new Map(publicPhotos.map((photo) => [String(photo.id || photo.localId || ''), photo]));
    const curatedIds = [...new Set((section?.photo_ids || []).map(String).filter(Boolean))];
    return curatedIds.map((id) => photoById.get(id)).filter(Boolean);
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
