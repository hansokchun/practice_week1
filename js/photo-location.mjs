export function hasUsableCoordinates(lat, lng) {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return false;
    return !(latitude === 0 && longitude === 0);
}

export function hasUsablePhotoLocation(photo) {
    return hasUsableCoordinates(photo?.lat, photo?.lng);
}
