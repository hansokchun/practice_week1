export function formatGoogleMapsLocation(lat, lng) {
    if (lat === null || lat === undefined || lng === null || lng === undefined) {
        return null;
    }
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }
    return `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}
