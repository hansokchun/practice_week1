export const PHOTO_SIGNED_URL_TTL_SECONDS = 900;
const PHOTO_SIGNED_URL_REFRESH_LEAD_MS = 60_000;

export function shouldRefreshPhotoSignedUrl(photo = {}, now = Date.now()) {
    if (!photo.storage_path) return false;
    if (!photo.url) return true;
    const expiresAt = Number(photo.signed_url_expires_at);
    if (!Number.isFinite(expiresAt)) return true;
    return expiresAt - now <= PHOTO_SIGNED_URL_REFRESH_LEAD_MS;
}

export function reusePhotoSignedUrls(photo, previous, now = Date.now()) {
    if (!previous || !photo.storage_path
        || photo.storage_path !== previous.storage_path
        || photo.owner_id !== previous.owner_id
        || photo.visibility !== previous.visibility
        || shouldRefreshPhotoSignedUrl(previous, now)) return photo;

    return {
        ...photo,
        url: previous.url,
        signed_url_expires_at: previous.signed_url_expires_at,
        thumbnail_url: photo.thumbnail_path === previous.thumbnail_path ? previous.thumbnail_url : null
    };
}
