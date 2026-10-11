export const DEFAULT_PERSONAL_PHOTO_SORT = 'uploaded-newest';
const PERSONAL_PHOTO_SORTS = new Set([
    DEFAULT_PERSONAL_PHOTO_SORT, 'taken-newest', 'taken-oldest'
]);

export function normalizePersonalPhotoSort(value) {
    return PERSONAL_PHOTO_SORTS.has(value) ? value : DEFAULT_PERSONAL_PHOTO_SORT;
}

function parsePhotoTimestamp(value) {
    if (!value) return null;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
}

function comparePhotoTimestamps(a, b, oldestFirst = false) {
    if (a === null) return b === null ? 0 : 1;
    if (b === null) return -1;
    return oldestFirst ? a - b : b - a;
}

export function sortPersonalPhotos(photos = [], value = DEFAULT_PERSONAL_PHOTO_SORT) {
    const order = normalizePersonalPhotoSort(value);
    const items = Array.isArray(photos) ? photos : [];
    return items.map((photo, index) => ({
        photo, index,
        uploadedAt: parsePhotoTimestamp(photo.created_at),
        takenAt: parsePhotoTimestamp(photo.date)
    })).sort((a, b) => {
        const primary = order.startsWith('taken-') ? comparePhotoTimestamps(a.takenAt, b.takenAt, order === 'taken-oldest')
            : comparePhotoTimestamps(a.uploadedAt, b.uploadedAt);
        return primary
            || comparePhotoTimestamps(a.uploadedAt, b.uploadedAt)
            || String(a.photo.id || '').localeCompare(String(b.photo.id || ''), 'en', { numeric: true })
            || a.index - b.index;
    }).map(item => item.photo);
}

export function loadPersonalPhotoSort(storage, userId = '') {
    if (!storage || !userId) return DEFAULT_PERSONAL_PHOTO_SORT;
    try {
        return normalizePersonalPhotoSort(storage.getItem(`ikkyee:photo-sort:${userId}`));
    } catch {
        return DEFAULT_PERSONAL_PHOTO_SORT;
    }
}

export function savePersonalPhotoSort(storage, userId = '', value = DEFAULT_PERSONAL_PHOTO_SORT) {
    const order = normalizePersonalPhotoSort(value);
    if (storage && userId) {
        try { storage.setItem(`ikkyee:photo-sort:${userId}`, order); } catch {}
    }
    return order;
}
