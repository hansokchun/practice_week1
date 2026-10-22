import { hasUsableCoordinates } from './photo-location.mjs';

const FIRST_PHOTO_INVITATION_KEY_PREFIX = 'ikkyee:photo-contribution:first-photo-invitation-dismissed:';

function getFirstPhotoInvitationKey(userId) {
    return `${FIRST_PHOTO_INVITATION_KEY_PREFIX}${userId}`;
}

function getPhotoVisibility(photo) {
    if (!photo || typeof photo !== 'object') return 'unknown';
    if (photo.visibility === 'public' || photo.visibility === 'private' || photo.visibility === 'link') {
        return photo.visibility;
    }
    if (Object.hasOwn(photo, 'visibility')) return 'unknown';
    if (photo.shared === true) return 'public';
    if (photo.shared === false) return 'private';
    return 'unknown';
}

function getVisibilitySummary(photos) {
    const visibilityCounts = photos.reduce((counts, photo) => {
        counts[getPhotoVisibility(photo)] += 1;
        return counts;
    }, { public: 0, private: 0, link: 0, unknown: 0 });
    const { public: publicCount, private: privateCount, link: linkCount, unknown: unknownCount } = visibilityCounts;

    if (unknownCount > 0) return `${photos.length}장의 사진을 저장했어요.`;
    if (privateCount === photos.length) return `${photos.length}장의 사진을 비공개로 저장했어요.`;
    if (publicCount === photos.length) return `${photos.length}장의 사진을 공개로 저장했어요.`;

    const visibilityParts = [];
    if (publicCount > 0) visibilityParts.push(`공개 ${publicCount}장`);
    if (privateCount > 0) visibilityParts.push(`비공개 ${privateCount}장`);
    if (linkCount > 0) visibilityParts.push(`링크 공유 ${linkCount}장`);
    return `${visibilityParts.join(', ')}을 저장했어요.`;
}

export function shouldShowFirstPhotoInvitation({
    userId = null,
    hasLoadedPhotos = false,
    loadError = null,
    photoCount = null,
    dismissed = false
} = {}) {
    return Boolean(userId)
        && hasLoadedPhotos === true
        && !loadError
        && photoCount === 0
        && !dismissed;
}

export function loadFirstPhotoInvitationDismissed(storage, userId) {
    if (!userId || typeof storage?.getItem !== 'function') return false;

    try {
        return storage?.getItem(getFirstPhotoInvitationKey(userId)) === 'true';
    } catch {
        return false;
    }
}

export function dismissFirstPhotoInvitation(storage, userId) {
    if (!userId || typeof storage?.setItem !== 'function') return false;

    try {
        storage?.setItem(getFirstPhotoInvitationKey(userId), 'true');
        return true;
    } catch {
        return false;
    }
}

export function getContributionInsertIndex(sectionCount) {
    if (!Number.isInteger(sectionCount) || sectionCount < 2) return null;
    return Math.min(2, sectionCount - 1);
}

export function getUploadCompletionGuidance(uploadedPhotos = [], totalPhotoCount = 0) {
    const photos = Array.isArray(uploadedPhotos) ? uploadedPhotos : [];
    const hasLocatedPhotos = photos.some((photo) => hasUsableCoordinates(photo?.lat, photo?.lng));

    if (photos.length === 0) {
        return {
            title: '내 사진을 둘러보세요',
            summary: totalPhotoCount > 0
                ? '저장한 사진은 내 보관함에서 확인할 수 있어요. 새로운 장소도 사진으로 남겨보세요.'
                : '아직 저장된 사진이 없어요. 사진을 올리면 나만의 여행 기록을 시작할 수 있어요.',
            hasLocatedPhotos
        };
    }

    const title = totalPhotoCount === photos.length ? '첫 사진을 남겼어요!' : '사진을 저장했어요!';
    const locationSummary = hasLocatedPhotos
        ? ' 위치가 있는 사진은 내 지도에서 바로 볼 수 있어요.'
        : ' 위치를 추가하면 사진을 내 지도와 연결할 수 있어요.';

    return {
        title,
        summary: `${getVisibilitySummary(photos)}${locationSummary}`,
        hasLocatedPhotos
    };
}
