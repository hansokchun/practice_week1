import { hasUsableCoordinates } from './photo-location.mjs';

const DEFAULT_LOCATION = {
    lat: '37.579617',
    lng: '126.977041'
};

export function hasCompleteLocation(photo) {
    return hasUsableCoordinates(photo?.lat, photo?.lng);
}

export function getMissingLocationPhotos(photos = []) {
    return photos.filter((photo) => !hasCompleteLocation(photo) && photo?.location_assignment_skipped !== true);
}

export function getLocationEditorPhoto(photos = [], selectedPhotoId = null) {
    const missingPhotos = getMissingLocationPhotos(photos);
    const selectedPhoto = missingPhotos.find((photo) => photo.id === selectedPhotoId)
        || photos.find((photo) => photo.id === selectedPhotoId);
    return selectedPhoto || missingPhotos[0] || photos[0] || null;
}

export function normalizeLocationDraft(photo) {
    const latitude = Number(photo?.lat);
    const longitude = Number(photo?.lng);
    const isZeroPair = latitude === 0 && longitude === 0;
    const hasLat = photo?.lat !== null && photo?.lat !== undefined
        && !isZeroPair && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90;
    const hasLng = photo?.lng !== null && photo?.lng !== undefined
        && !isZeroPair && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
    if (!hasLat || !hasLng) return { ...DEFAULT_LOCATION };
    return {
        lat: String(photo.lat),
        lng: String(photo.lng)
    };
}
