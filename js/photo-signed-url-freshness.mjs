export const PHOTO_SIGNED_URL_TTL_SECONDS = 900;
const PHOTO_SIGNED_URL_REFRESH_LEAD_MS = 60_000;

export function shouldRefreshPhotoSignedUrl(photo = {}, now = Date.now()) {
    if (!photo.storage_path) return false;
    if (!photo.url) return true;
    const expiresAt = Number(photo.signed_url_expires_at);
    if (!Number.isFinite(expiresAt)) return true;
    return expiresAt - now <= PHOTO_SIGNED_URL_REFRESH_LEAD_MS;
}
