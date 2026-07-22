const PUBLIC_PHOTO_URL_MARKER = '/storage/v1/object/public/photos/';

export function getPhotoStoragePath(photo = {}) {
    const savedPath = String(photo.storage_path || '').trim();
    if (savedPath) return savedPath;

    const legacyUrl = String(photo.url || '').trim();
    if (!legacyUrl) return null;

    try {
        const parsed = new URL(legacyUrl);
        const markerIndex = parsed.pathname.indexOf(PUBLIC_PHOTO_URL_MARKER);
        if (markerIndex === -1) return null;
        return decodeURIComponent(parsed.pathname.slice(markerIndex + PUBLIC_PHOTO_URL_MARKER.length));
    } catch {
        return null;
    }
}

export function applySignedPhotoUrls(photos = [], signedUrlByPath = new Map()) {
    return photos.map((photo) => {
        const storagePath = getPhotoStoragePath(photo);
        const signedUrl = storagePath ? signedUrlByPath.get(storagePath) : null;
        return signedUrl ? { ...photo, url: signedUrl } : { ...photo };
    });
}
