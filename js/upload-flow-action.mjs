export function getUploadNextRoute(photoCount) {
    return Number(photoCount || 0) > 0 ? 'review' : 'upload';
}
