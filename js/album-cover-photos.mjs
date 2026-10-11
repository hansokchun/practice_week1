import { getPhotoStoragePath } from './photo-storage.mjs';

export function getAlbumCoverPhotos(album = {}, photos = []) {
    const coverPath = getPhotoStoragePath({ url: album.cover_url });
    const coverPhoto = coverPath ? photos.find(photo => [
        getPhotoStoragePath(photo), photo.thumbnail_path, photo.preview_path
    ].includes(coverPath)) : null;
    const albumPhotos = photos.filter(photo => album.id && String(photo.album_id) === String(album.id));
    return [...new Set([coverPhoto, ...albumPhotos].filter(Boolean))];
}
