import { getProfilePhotoMetrics } from './profile-photo-metrics.mjs';

function hasCoordinate(value) {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

export function buildAccountNotificationItems({
    currentUserId = '',
    savedPhotos = [],
    likedPhotoIds = [],
    isMissingLocationBannerDismissed = false,
    missingLocationNotifications = true,
    librarySummaryNotifications = true,
    welcomeNotices = []
} = {}) {
    const viewerId = String(currentUserId || '');
    if (!viewerId) return [];

    const likedIds = new Set(likedPhotoIds.map(String));
    const myPhotos = savedPhotos.filter((photo) => String(photo.owner_id || '') === viewerId);
    const missingLocationCount = myPhotos.filter((photo) => (
        !hasCoordinate(photo.lat) || !hasCoordinate(photo.lng)
    )).length;
    const likedPhotoCount = savedPhotos.filter((photo) => likedIds.has(String(photo.id))).length;
    const { receivedLikeCount } = getProfilePhotoMetrics(myPhotos, viewerId);
    const items = [...welcomeNotices];

    if (missingLocationNotifications && missingLocationCount && !isMissingLocationBannerDismissed) {
        items.push({
            icon: 'location_off',
            title: `${missingLocationCount}장의 사진에 위치를 지정해보세요!`,
            body: '어디서 찍었는지 알려주면 지도에 담을 수 있어요.',
            route: 'photos'
        });
    }
    if (librarySummaryNotifications && likedPhotoCount) {
        items.push({
            icon: 'favorite',
            title: `좋아요 누른 사진 ${likedPhotoCount}장`,
            body: '마음에 든 사진들을 모아뒀어요.',
            route: 'liked'
        });
    }
    if (librarySummaryNotifications && receivedLikeCount) {
        items.push({
            icon: 'favorite',
            title: `${receivedLikeCount}개의 좋아요를 받았어요!`,
            body: '내 사진에 마음을 남겨줬어요.',
            route: 'photos'
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
