const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PHOTO_SIZE_BYTES = 15 * 1024 * 1024;

export function validatePhotoFile(file) {
    if (!ACCEPTED_TYPES.has(file?.type)) {
        return {
            accepted: false,
            reason: '지원하지 않는 파일 형식입니다.'
        };
    }
    if (Number(file?.size || 0) > MAX_PHOTO_SIZE_BYTES) {
        return {
            accepted: false,
            reason: '15MB 이하의 사진만 올릴 수 있습니다.'
        };
    }
    return {
        accepted: true,
        reason: null
    };
}

export function filterAcceptedPhotoFiles(files = []) {
    return Array.from(files).reduce((result, file) => {
        const validation = validatePhotoFile(file);
        if (validation.accepted) result.accepted.push(file);
        else result.rejected.push({ file, reason: validation.reason });
        return result;
    }, { accepted: [], rejected: [] });
}
