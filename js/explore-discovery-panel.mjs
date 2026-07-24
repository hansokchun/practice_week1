function getTimestamp(photo) {
    const value = photo?.created_at || photo?.uploaded_at || photo?.createdAt || photo?.date || '';
    const time = value ? new Date(value).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
}

function getCoordinateValue(value) {
    return typeof value === 'function' ? Number(value()) : Number(value);
}

export function normalizeExploreBounds(bounds) {
    if (!bounds) return null;
    if (
        Number.isFinite(Number(bounds.north))
        && Number.isFinite(Number(bounds.south))
        && Number.isFinite(Number(bounds.east))
        && Number.isFinite(Number(bounds.west))
    ) {
        return {
            north: Number(bounds.north),
            south: Number(bounds.south),
            east: Number(bounds.east),
            west: Number(bounds.west)
        };
    }

    const northEast = bounds.getNorthEast?.();
    const southWest = bounds.getSouthWest?.();
    if (!northEast || !southWest) return null;

    const north = getCoordinateValue(northEast.lat);
    const east = getCoordinateValue(northEast.lng);
    const south = getCoordinateValue(southWest.lat);
    const west = getCoordinateValue(southWest.lng);
    if (![north, east, south, west].every(Number.isFinite)) return null;
    return { north, south, east, west };
}

function isPhotoInsideBounds(photo, bounds) {
    if (!bounds) return true;
    const lat = Number(photo?.lat);
    const lng = Number(photo?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    const insideLat = lat <= bounds.north && lat >= bounds.south;
    const insideLng = bounds.west <= bounds.east
        ? lng >= bounds.west && lng <= bounds.east
        : lng >= bounds.west || lng <= bounds.east;
    return insideLat && insideLng;
}

function disperseRepeatedOwners(photos) {
    const remaining = [...photos];
    const result = [];
    while (remaining.length) {
        const lastOwner = result.at(-1)?.owner_id || result.at(-1)?.albumOwnerId || '';
        const alternateIndex = lastOwner
            ? remaining.findIndex((photo) => (photo.owner_id || photo.albumOwnerId || '') !== lastOwner)
            : -1;
        const index = alternateIndex > 0 ? alternateIndex : 0;
        result.push(remaining.splice(index, 1)[0]);
    }
    return result;
}

export function getExploreDiscoveryPhotos(photos, options = {}) {
    const bounds = normalizeExploreBounds(options.bounds);
    const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : 30;
    const sorted = [...(photos || [])]
        .filter((photo) => isPhotoInsideBounds(photo, bounds))
        .sort((a, b) => getTimestamp(b) - getTimestamp(a));
    return disperseRepeatedOwners(sorted).slice(0, Math.max(0, limit));
}

export function shouldPreserveExploreViewport(photos, bounds) {
    const normalizedBounds = normalizeExploreBounds(bounds);
    if (!normalizedBounds) return false;
    return (photos || []).some((photo) => isPhotoInsideBounds(photo, normalizedBounds));
}
