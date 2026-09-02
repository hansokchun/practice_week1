import { hasUsableCoordinates } from './photo-location.mjs';

function getTakenAt(photo) {
    const timestamp = new Date(photo?.date || photo?.created_at || '').getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
}

export function getMissingLocationAssignmentPhotos(photos = [], ownerId = null) {
    return photos
        .filter((photo) => (!ownerId || photo?.owner_id === ownerId))
        .filter((photo) => !hasUsableCoordinates(photo?.lat, photo?.lng))
        .sort((left, right) => (getTakenAt(left) ?? Number.MAX_SAFE_INTEGER) - (getTakenAt(right) ?? Number.MAX_SAFE_INTEGER));
}

export function getLocationAssignmentPhoto(photos = [], selectedPhotoId = null, ownerId = null) {
    const missingPhotos = getMissingLocationAssignmentPhotos(photos, ownerId);
    return missingPhotos.find((photo) => String(photo.id) === String(selectedPhotoId)) || missingPhotos[0] || null;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function getNearbyLocatedPhotos(photos = [], selectedPhoto = null) {
    const selectedTime = getTakenAt(selectedPhoto);
    if (!selectedPhoto || selectedTime === null) return [];

    const located = photos
        .filter((photo) => String(photo?.id) !== String(selectedPhoto.id))
        .filter((photo) => hasUsableCoordinates(photo?.lat, photo?.lng))
        .map((photo) => ({ photo, timestamp: getTakenAt(photo) }))
        .filter((entry) => entry.timestamp !== null);

    const before = located
        .filter((entry) => entry.timestamp < selectedTime && selectedTime - entry.timestamp <= ONE_DAY_MS)
        .sort((left, right) => right.timestamp - left.timestamp)
        .slice(0, 1)
        .map((entry) => ({ ...entry.photo, relativeDirection: 'before', timeDifferenceMs: selectedTime - entry.timestamp }));
    const after = located
        .filter((entry) => entry.timestamp > selectedTime && entry.timestamp - selectedTime <= ONE_DAY_MS)
        .sort((left, right) => left.timestamp - right.timestamp)
        .slice(0, 1)
        .map((entry) => ({ ...entry.photo, relativeDirection: 'after', timeDifferenceMs: entry.timestamp - selectedTime }));

    return [...before, ...after];
}

export function getUploadCompletionPhotos(photos = [], lastSavedPhotoIds = []) {
    const ids = new Set(lastSavedPhotoIds.map(String));
    return photos.filter((photo) => ids.has(String(photo?.id)));
}
