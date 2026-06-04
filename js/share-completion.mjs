import { buildTripHash } from './share-link.mjs';

export function getShareCompletionHash(visibility, albumId) {
    if (visibility === 'public' && albumId) return buildTripHash(albumId);
    return '#/myphoto';
}

export function getShareTargetAlbumId(updatedAlbum, fallbackAlbum) {
    return updatedAlbum?.id || fallbackAlbum?.id || null;
}
