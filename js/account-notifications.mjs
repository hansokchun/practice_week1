import { getProfilePhotoMetrics } from './profile-photo-metrics.mjs';
import { getMissingLocationAssignmentPhotos } from './location-assignment.mjs';

export function buildAccountNotificationItems({
    currentUserId = '',
    savedPhotos = [],
    likedPhotoIds = [],
    missingLocationNotifications = true,
    librarySummaryNotifications = true,
    welcomeNotices = []
} = {}) {
    const viewerId = String(currentUserId || '');
    if (!viewerId) return [];

    const likedIds = new Set(likedPhotoIds.map(String));
    const myPhotos = savedPhotos.filter((photo) => String(photo.owner_id || '') === viewerId);
    const missingLocationCount = getMissingLocationAssignmentPhotos(myPhotos).length;
    const likedPhotoCount = savedPhotos.filter((photo) => likedIds.has(String(photo.id))).length;
    const { receivedLikeCount } = getProfilePhotoMetrics(myPhotos, viewerId);
    const items = [...welcomeNotices];

    if (missingLocationNotifications && missingLocationCount) {
        items.push({
            icon: 'location_off',
            title: `${missingLocationCount}장의 사진에 위치를 지정해보세요!`,
            route: 'location-assign'
        });
    }
    if (librarySummaryNotifications && likedPhotoCount) {
        items.push({
            icon: 'favorite',
            title: `좋아요 누른 사진 ${likedPhotoCount}장`,
            route: 'liked'
        });
    }
    if (librarySummaryNotifications && receivedLikeCount) {
        items.push({
            icon: 'favorite',
            title: `${receivedLikeCount}개의 좋아요를 받았어요!`,
            route: 'photos'
        });
    }

    if (!items.length) {
        items.push({
            icon: 'notifications',
            title: '새 알림 없음',
            route: ''
        });
    }

    return items;
}
