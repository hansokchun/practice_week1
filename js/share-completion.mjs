import { buildTripHash } from './share-link.mjs';

export function getShareCompletionHash(visibility, albumId) {
    if (visibility === 'public') return buildTripHash(albumId);
    return '#/share';
}
