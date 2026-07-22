const LOCATION_PRECISIONS = new Set(['exact', 'approximate', 'hidden']);

export function normalizeLocationPrecision(value, fallback = 'hidden') {
    return LOCATION_PRECISIONS.has(value) ? value : fallback;
}

export function canShowPhotoOnPublicMap(photo = {}) {
    const precision = normalizeLocationPrecision(photo.location_precision);
    return precision !== 'hidden'
        && Number.isFinite(Number(photo.lat))
        && Number.isFinite(Number(photo.lng));
}

export function getLocationPrecisionLabel(value) {
    const precision = normalizeLocationPrecision(value);
    if (precision === 'exact') return '정확한 위치';
    if (precision === 'approximate') return '대략 위치';
    return '위치 숨김';
}
