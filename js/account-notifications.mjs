function hasCoordinate(value) {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

export function buildAccountNotificationItems({
    currentUserId = '',
    savedPhotos = [],
    likedPhotoIds = [],
    isMissingLocationBannerDismissed = false,
    missingLocationNotifications = true,
    librarySummaryNotifications = true
} = {}) {
    const viewerId = String(currentUserId || '');
    if (!viewerId) return [];

    const likedIds = new Set(likedPhotoIds.map(String));
    const myPhotos = savedPhotos.filter((photo) => String(photo.owner_id || '') === viewerId);
    const missingLocationCount = myPhotos.filter((photo) => (
        !hasCoordinate(photo.lat) || !hasCoordinate(photo.lng)
    )).length;
    const likedPhotoCount = savedPhotos.filter((photo) => likedIds.has(String(photo.id))).length;
    const publicPhotoCount = myPhotos.filter((photo) => (
        photo.shared || ['public', 'link'].includes(photo.visibility)
    )).length;
    const items = [];

    if (missingLocationNotifications && missingLocationCount && !isMissingLocationBannerDismissed) {
        items.push({
            icon: 'location_on',
            title: `위치 정보 없는 사진 ${missingLocationCount}장`,
            body: '지도에 표시하려면 위치를 지정하세요.',
            route: 'photos'
        });
    }
    if (librarySummaryNotifications && likedPhotoCount) {
        items.push({
            icon: 'favorite',
            title: `좋아요한 사진 ${likedPhotoCount}장`,
            body: '모아둔 공개 사진을 다시 확인하세요.',
            route: 'liked'
        });
    }
    if (librarySummaryNotifications && publicPhotoCount) {
        items.push({
            icon: 'public',
            title: `공개 중인 사진 ${publicPhotoCount}장`,
            body: 'Explore에 보이는 내 사진을 확인하세요.',
            route: 'explore'
        });
    }

    if (!items.length) {
        items.push({
            icon: 'notifications',
            title: '새 알림 없음',
            body: '사진을 올리면 필요한 알림을 알려드릴게요.',
            route: ''
        });
    }

    return items;
}
