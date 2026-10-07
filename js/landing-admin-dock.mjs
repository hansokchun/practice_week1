import { getPhotoPage } from './photo-pagination.mjs';

export function getLandingAdminDockPage(photos = [], page = 1) {
    return getPhotoPage(photos, page, 8);
}

export function addLandingAdminPhoto(photoIds = [], photoId, limit = 20) {
    const ids = [...new Set(photoIds.map(String))];
    const id = String(photoId || '');
    if (!id || ids.includes(id)) return { photoIds: ids, status: 'unchanged' };
    if (ids.length >= limit) return { photoIds: ids, status: 'full' };
    return { photoIds: [...ids, id], status: 'added' };
}
