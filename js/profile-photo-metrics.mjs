export function getProfilePhotoMetrics(photos = [], ownerId = '') {
    const owned = ownerId ? photos.filter(photo => String(photo.owner_id || '') === String(ownerId)) : [];
    return {
        photoCount: owned.length,
        publicCount: owned.filter(photo => photo.shared || photo.visibility === 'public').length,
        receivedLikeCount: owned.reduce((total, photo) => {
            const likes = Number(photo.liked || 0);
            return total + (Number.isFinite(likes) ? Math.max(0, Math.floor(likes)) : 0);
        }, 0)
    };
}
