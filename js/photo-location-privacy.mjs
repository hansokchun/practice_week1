const LOCATION_PRECISIONS = new Set(['exact', 'approximate', 'hidden']);

function hasCoordinate(value) {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

export function normalizeLocationPrecision(value, fallback = 'approximate') {
    return LOCATION_PRECISIONS.has(value) ? value : fallback;
}

// Legacy hidden rows remain readable, but the owner-facing editor now offers
// only the two publishable location levels.
export function getEditableLocationPrecision(value) {
    return value === 'exact' ? 'exact' : 'approximate';
}

export function canShowPhotoOnPublicMap(photo = {}) {
    return normalizeLocationPrecision(photo.location_precision) !== 'hidden'
        && hasCoordinate(photo.lat)
        && hasCoordinate(photo.lng);
}

export function canShowPhotoInExploreScope(photo = {}, { scope = 'others', currentUserId = '' } = {}) {
    const ownerId = String(photo.owner_id || '');
    const viewerId = String(currentUserId || '');
    const isMine = Boolean(viewerId) && ownerId === viewerId;
    const hasCoordinates = hasCoordinate(photo.lat) && hasCoordinate(photo.lng);

    if (scope === 'mine') return isMine && hasCoordinates;

    const isPublic = Boolean(photo.shared) || ['public', 'link'].includes(photo.visibility);
    return (!viewerId || !isMine) && isPublic && canShowPhotoOnPublicMap(photo);
}

export function getLocationPrecisionLabel(value) {
    const precision = normalizeLocationPrecision(value);
    if (precision === 'exact') return '정확한 위치';
    if (precision === 'approximate') return '대략 위치';
    return '대략 위치';
}
