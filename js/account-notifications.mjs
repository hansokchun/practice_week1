import { getMissingLocationAssignmentPhotos } from './location-assignment.mjs';

export function buildAccountNotificationItems({
    currentUserId = '',
    savedPhotos = [],
    receivedLikes = null,
    missingLocationNotifications = true,
    librarySummaryNotifications = true,
    welcomeNotices = [],
    moderationWarnings = []
} = {}) {
    const viewerId = String(currentUserId || '');
    if (!viewerId) return [];

    const myPhotos = savedPhotos.filter((photo) => String(photo.owner_id || '') === viewerId);
    const missingLocationCount = getMissingLocationAssignmentPhotos(myPhotos).length;
    const receivedLikeCount = Math.max(0, Number(receivedLikes?.received_count || 0) - Number(receivedLikes?.read_count || 0));
    const items = [...moderationWarnings.map(item => ({ icon: 'warning', title: '관리자 경고를 확인해주세요.', moderationId: item.id })), ...welcomeNotices];

    if (missingLocationNotifications && missingLocationCount) {
        items.push({
            icon: 'location_off',
            title: `${missingLocationCount}장의 사진에 위치를 지정해보세요!`,
            route: 'location-assign'
        });
    }
    if (librarySummaryNotifications && receivedLikeCount) {
        items.push({
            icon: 'favorite',
            title: `${receivedLikeCount}개의 좋아요를 받았어요!`,
            seenCount: Number(receivedLikes.received_count),
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
