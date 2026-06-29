export const ACCOUNT_PHOTO_UPLOAD_LIMIT = 100;

export function getOwnedPhotoCount(user, photos = []) {
    const ownerId = user?.id;
    if (!ownerId) return 0;
    return (photos || []).filter((photo) => photo?.owner_id === ownerId).length;
}

export function getAccountUploadLimitStatus({
    user = null,
    photos = [],
    incomingUploadCount = 0
} = {}) {
    const ownedPhotoCount = getOwnedPhotoCount(user, photos);
    const remainingUploads = Math.max(0, ACCOUNT_PHOTO_UPLOAD_LIMIT - ownedPhotoCount);
    const incomingCount = Math.max(0, Number(incomingUploadCount || 0));

    return {
        photoLimit: ACCOUNT_PHOTO_UPLOAD_LIMIT,
        ownedPhotoCount,
        remainingUploads,
        canUpload: incomingCount <= remainingUploads
    };
}

export function getAccountUploadLimitMessage(status) {
    if (!status || status.canUpload) return '';
    return `\ubb34\ub8cc \uacc4\uc815\uc740 \uc0ac\uc9c4\uc744 \ucd5c\ub300 ${ACCOUNT_PHOTO_UPLOAD_LIMIT}\uc7a5\uae4c\uc9c0 \uc5c5\ub85c\ub4dc\ud560 \uc218 \uc788\uc5b4\uc694. \ud604\uc7ac \ub0a8\uc740 \uc5c5\ub85c\ub4dc \uac00\ub2a5 \uc218\ub294 ${status.remainingUploads}\uc7a5\uc785\ub2c8\ub2e4.`;
}
