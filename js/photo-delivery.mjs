export function getPhotoDeliverySource(photo = {}, variant = 'detail') {
    if (variant === 'thumbnail') return photo.thumbnail_url || photo.preview_url || '';
    if (variant === 'preview') return photo.preview_url || photo.thumbnail_url || '';
    return photo.url || '';
}

export function getLandingWarmSlideIndexes(index, count) {
    if (count <= 0) return [];
    const current = Math.min(Math.max(0, index), count - 1);
    return [...new Set([current, (current + 1) % count])];
}
