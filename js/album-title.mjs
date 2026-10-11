export function normalizeAlbumTitle(value) {
    return String(value ?? '').trim();
}

export function getAlbumDisplayTitle(value) {
    return normalizeAlbumTitle(value) || '제목 없는 앨범';
}
