const PUBLIC_PHOTO_URL_MARKER = '/storage/v1/object/public/photos/';
const SIGNED_PHOTO_URL_MARKER = '/storage/v1/object/sign/photos/';

export function getPhotoStoragePath(photo = {}) {
    const savedPath = String(photo.storage_path || '').trim();
    if (savedPath) return savedPath;

    const legacyUrl = String(photo.url || '').trim();
    if (!legacyUrl) return null;

    try {
        const parsed = new URL(legacyUrl);
        const marker = parsed.pathname.includes(PUBLIC_PHOTO_URL_MARKER)
            ? PUBLIC_PHOTO_URL_MARKER
            : SIGNED_PHOTO_URL_MARKER;
        const markerIndex = parsed.pathname.indexOf(marker);
        if (markerIndex === -1) return null;
        return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
    } catch {
        return null;
    }
}

export function applySignedAlbumCoverUrls(albums = [], signedUrlByPath = new Map()) {
    return albums.map((album) => {
        const storagePath = getPhotoStoragePath({ url: album.cover_url });
        const signedUrl = storagePath ? signedUrlByPath.get(storagePath) : null;
        return signedUrl ? { ...album, cover_url: signedUrl } : { ...album };
    });
}

export function applyPhotoUrlsToAlbumCovers(albums = [], photos = []) {
    const photoUrlByPath = new Map(
        photos
            .map((photo) => [getPhotoStoragePath(photo), photo.url])
            .filter(([path, url]) => path && url)
    );

    return albums.map((album) => {
        const storagePath = getPhotoStoragePath({ url: album.cover_url });
        const photoUrl = storagePath ? photoUrlByPath.get(storagePath) : null;
        return photoUrl ? { ...album, cover_url: photoUrl } : { ...album };
    });
}

export function applySignedPhotoUrls(photos = [], signedUrlByPath = new Map()) {
    return photos.map((photo) => {
        const storagePath = getPhotoStoragePath(photo);
        const signedUrl = storagePath ? signedUrlByPath.get(storagePath) : null;
        return signedUrl ? { ...photo, url: signedUrl } : { ...photo };
    });
}
