function toSafeCount(value) {
    const count = Number(value);
    return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

export function formatPhotoCount(value) {
    return `${toSafeCount(value)}장`;
}

export function formatPlaceCount(value) {
    return `${toSafeCount(value)}곳`;
}

export function formatAlbumCount(value) {
    return `${toSafeCount(value)}개 앨범`;
}

export function formatDayCount(value) {
    return `${toSafeCount(value)}일`;
}

export function formatPhotoPlaceMeta(photoCount, placeCount) {
    return `${formatPhotoCount(photoCount)} · ${formatPlaceCount(placeCount)}`;
}
