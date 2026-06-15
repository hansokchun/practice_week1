export const NEW_ACCOUNT_LIMIT_DAYS = 7;
export const NEW_ACCOUNT_DAILY_UPLOAD_LIMIT = 20;
export const NEW_ACCOUNT_PUBLIC_PHOTO_LIMIT = 5;

function parseTime(value) {
    const time = Date.parse(value || '');
    return Number.isFinite(time) ? time : null;
}

function getUserCreatedAt(user) {
    return parseTime(user?.created_at || user?.createdAt || user?.confirmed_at || user?.email_confirmed_at);
}

function isSameUtcDay(left, right) {
    const leftDate = new Date(left);
    const rightDate = new Date(right);
    return leftDate.getUTCFullYear() === rightDate.getUTCFullYear()
        && leftDate.getUTCMonth() === rightDate.getUTCMonth()
        && leftDate.getUTCDate() === rightDate.getUTCDate();
}

function isPublicPhoto(photo) {
    return Boolean(photo?.shared || photo?.visibility === 'public');
}

export function getNewAccountLimitStatus({
    user = null,
    photos = [],
    now = new Date(),
    incomingUploadCount = 0,
    requestedVisibility = 'private',
    incomingPublicCount = 0
} = {}) {
    const nowTime = parseTime(now) ?? Date.now();
    const createdAt = getUserCreatedAt(user);
    const ownerId = user?.id;
    const ageMs = createdAt ? Math.max(0, nowTime - createdAt) : 0;
    const ageDays = createdAt ? ageMs / 86400000 : 0;
    const isLimited = Boolean(ownerId && ageDays < NEW_ACCOUNT_LIMIT_DAYS);
    const ownedPhotos = (photos || []).filter((photo) => photo?.owner_id === ownerId);
    const todayUploadCount = ownedPhotos.filter((photo) => {
        const uploadedAt = parseTime(photo?.created_at || photo?.uploaded_at || photo?.createdAt);
        return uploadedAt !== null && isSameUtcDay(uploadedAt, nowTime);
    }).length;
    const publicPhotoCount = ownedPhotos.filter(isPublicPhoto).length;
    const uploadsRemainingToday = Math.max(0, NEW_ACCOUNT_DAILY_UPLOAD_LIMIT - todayUploadCount);
    const publicRemaining = Math.max(0, NEW_ACCOUNT_PUBLIC_PHOTO_LIMIT - publicPhotoCount);
    const wantsPublic = requestedVisibility === 'public';

    return {
        isLimited,
        daysRemaining: isLimited ? Math.max(1, Math.ceil(NEW_ACCOUNT_LIMIT_DAYS - ageDays)) : 0,
        uploadsRemainingToday,
        publicRemaining,
        canUpload: !isLimited || Number(incomingUploadCount || 0) <= uploadsRemainingToday,
        canPublish: !isLimited || !wantsPublic || Number(incomingPublicCount || 0) <= publicRemaining
    };
}

export function getNewAccountLimitMessage(status, action) {
    if (action === 'upload' && status?.isLimited && !status.canUpload) {
        return `신규 계정은 첫 ${NEW_ACCOUNT_LIMIT_DAYS}일 동안 하루 ${NEW_ACCOUNT_DAILY_UPLOAD_LIMIT}장까지만 업로드할 수 있어요. 오늘은 ${status.uploadsRemainingToday}장까지만 더 업로드할 수 있어요.`;
    }
    if (action === 'publish' && status?.isLimited && !status.canPublish) {
        return `신규 계정은 첫 ${NEW_ACCOUNT_LIMIT_DAYS}일 동안 공개 사진을 ${NEW_ACCOUNT_PUBLIC_PHOTO_LIMIT}장까지만 설정할 수 있어요. ${status.daysRemaining}일 뒤에 더 공개할 수 있어요.`;
    }
    return '';
}
