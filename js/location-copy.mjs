import { hasUsableCoordinates } from './photo-location.mjs';

export function formatGoogleMapsLocation(lat, lng) {
    if (!hasUsableCoordinates(lat, lng)) return null;
    const latitude = Number(lat);
    const longitude = Number(lng);
    return `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}
