const DEFAULT_LOCATION = {
    lat: '33.450701',
    lng: '126.570667'
};

export function hasCompleteLocation(photo) {
    return photo?.lat !== null
        && photo?.lat !== undefined
        && photo?.lng !== null
        && photo?.lng !== undefined
        && Number.isFinite(Number(photo.lat))
        && Number.isFinite(Number(photo.lng));
}

export function getMissingLocationPhotos(photos = []) {
    return photos.filter((photo) => !hasCompleteLocation(photo));
}

export function getLocationEditorPhoto(photos = [], selectedPhotoId = null) {
    const missingPhotos = getMissingLocationPhotos(photos);
    const selectedPhoto = missingPhotos.find((photo) => photo.id === selectedPhotoId)
        || photos.find((photo) => photo.id === selectedPhotoId);
    return selectedPhoto || missingPhotos[0] || photos[0] || null;
}

export function normalizeLocationDraft(photo) {
    return {
        lat: photo?.lat !== null && photo?.lat !== undefined && Number.isFinite(Number(photo.lat))
            ? String(photo.lat)
            : DEFAULT_LOCATION.lat,
        lng: photo?.lng !== null && photo?.lng !== undefined && Number.isFinite(Number(photo.lng))
            ? String(photo.lng)
            : DEFAULT_LOCATION.lng
    };
}
