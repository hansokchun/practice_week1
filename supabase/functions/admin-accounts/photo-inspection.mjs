const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export function getAdminPhotoFilters(body) {
    const page = body.page ?? 1, day = body.day === undefined ? '' : body.day, ownerId = body.ownerId === undefined ? '' : body.ownerId;
    if (!Number.isInteger(page) || page < 1 || page > 10000 || typeof day !== 'string' || typeof ownerId !== 'string') return null;
    if (ownerId && !uuid(ownerId)) return null;
    if (day) {
        if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(day)) return null;
        const date = new Date(`${day}T00:00:00.000Z`);
        if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) return null;
    }
    return { page, ...(day ? { day } : {}), ...(ownerId ? { ownerId } : {}) };
}

export const isAdminPhotoId = value => typeof value === 'string' && /^[\p{L}\p{N}._:-]{1,200}$/u.test(value);

export function getKstDayBounds(day) {
    const start = new Date(`${day}T00:00:00.000Z`).getTime() - 9 * 60 * 60 * 1000;
    return { start: new Date(start).toISOString(), end: new Date(start + 24 * 60 * 60 * 1000).toISOString() };
}

export function isOwnedPhotoPath(path, ownerId) {
    if (!uuid(ownerId) || typeof path !== 'string' || path.length > 1024 || /[\\%?#:\u0000-\u0020\u007f]/.test(path)) return false;
    const segments = path.split('/');
    return segments.length >= 2 && segments[0] === ownerId && segments.slice(1).every(segment => segment && segment !== '.' && segment !== '..');
}

export function getOwnedDerivative(photo) {
    return [photo.thumbnail_path, photo.preview_path].find(path => isOwnedPhotoPath(path, photo.owner_id)
        && (path.startsWith(`${photo.owner_id}/thumbnails/`) || path.startsWith(`${photo.owner_id}/previews/`)));
}

export function getOwnedOriginal(photo) {
    const path = photo?.storage_path;
    if (!isOwnedPhotoPath(path, photo?.owner_id) || ['thumbnails', 'previews'].includes(path.split('/')[1])) return null;
    return path;
}
