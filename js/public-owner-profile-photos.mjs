import { canShowPhotoOnPublicMap } from './photo-location-privacy.mjs';

function getPhotoKey(photo = {}) {
    return String(photo.id || photo.localId || photo.url || '');
}

function isPublicPhoto(photo = {}) {
    return Boolean(photo.shared) || ['public', 'link'].includes(photo.visibility);
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
