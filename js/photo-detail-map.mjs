import { canShowPhotoOnPublicMap } from './photo-location-privacy.mjs';

export const PHOTO_DETAIL_MAP_ZOOM = 14;

function hasCoordinate(value) {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

function getPhotoKey(photo = {}) {
    return String(photo.id || photo.localId || photo.url || '');
}

function isPublicPhoto(photo = {}) {
    return Boolean(photo.shared) || ['public', 'link'].includes(photo.visibility);
}

export function getPhotoDetailMapViewport(photo = {}) {
    if (!hasCoordinate(photo.lat) || !hasCoordinate(photo.lng)) return null;
    return {
        center: { lat: Number(photo.lat), lng: Number(photo.lng) },
        zoom: PHOTO_DETAIL_MAP_ZOOM
    };
}

export function getPhotoDetailOwnerMapItems(selectedPhoto = {}, candidates = [], currentUserId = '') {
    const selectedKey = getPhotoKey(selectedPhoto);
    const ownerId = String(selectedPhoto.owner_id || '');
    const viewerId = String(currentUserId || '');
    const isOwner = Boolean(ownerId && viewerId === ownerId);
    const seen = new Set();

    return [selectedPhoto, ...candidates]
        .filter((photo) => {
            const key = getPhotoKey(photo);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            if (String(photo.owner_id || '') !== ownerId) return false;
            if (!hasCoordinate(photo.lat) || !hasCoordinate(photo.lng)) return false;
            return isOwner || (isPublicPhoto(photo) && canShowPhotoOnPublicMap(photo));
        })
        .map((photo) => ({
            ...photo,
            isSelected: getPhotoKey(photo) === selectedKey
        }));
}
