export function getPublicAlbumCardClass(albumId, selectedAlbumId) {
    if (!albumId || !selectedAlbumId) return '';
    return albumId === selectedAlbumId ? 'is-selected' : '';
}
