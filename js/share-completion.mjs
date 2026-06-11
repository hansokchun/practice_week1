import { buildTripHash } from './share-link.mjs';

export function getShareCompletionHash(visibility, albumId) {
    if (visibility === 'public' && albumId) return buildTripHash(albumId);
    return '#/';
}

export function getShareTargetAlbumId(updatedAlbum, fallbackAlbum) {
    return updatedAlbum?.id || fallbackAlbum?.id || null;
}
