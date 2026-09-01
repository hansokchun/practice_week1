import { canShowPhotoOnPublicMap } from './photo-location-privacy.mjs';

function getPhotoKey(photo = {}) {
    return String(photo.id || photo.localId || photo.url || '');
}

function isPublicPhoto(photo = {}) {
    return Boolean(photo.shared) || ['public', 'link'].includes(photo.visibility);
}

function hasCoordinates(photo = {}) {
    if (photo.lat === null || photo.lat === undefined || photo.lat === '' || photo.lng === null || photo.lng === undefined || photo.lng === '') return false;
    return Number.isFinite(Number(photo.lat)) && Number.isFinite(Number(photo.lng));
}

export function getPublicOwnerProfilePhotos(photos = [], ownerId = '') {
    const expectedOwnerId = String(ownerId || '');
    const seen = new Set();

    return photos.filter((photo) => {
        const key = getPhotoKey(photo);
        const photoOwnerId = String(photo.owner_id || photo.albumOwnerId || '');
        if (!key || seen.has(key) || photoOwnerId !== expectedOwnerId || !isPublicPhoto(photo)) return false;
        seen.add(key);
        return true;
    });
}

export function getPublicOwnerProfileMapPhotos(photos = []) {
    return photos.filter(canShowPhotoOnPublicMap);
}

export function getOwnerProfileMapPhotos(photos = [], ownerId = '', viewerId = '') {
    const expectedOwnerId = String(ownerId || '');
    const isOwner = expectedOwnerId && expectedOwnerId === String(viewerId || '');
    if (!isOwner) {
        return getPublicOwnerProfileMapPhotos(getPublicOwnerProfilePhotos(photos, expectedOwnerId));
    }

    const seen = new Set();
    return photos.filter((photo) => {
        const key = getPhotoKey(photo);
        const photoOwnerId = String(photo.owner_id || photo.albumOwnerId || '');
        if (!key || seen.has(key) || photoOwnerId !== expectedOwnerId || !hasCoordinates(photo)) return false;
        seen.add(key);
        return true;
    });
}
