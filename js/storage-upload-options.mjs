export function getStorageUploadOptions(file) {
    return {
        contentType: file?.type || 'image/jpeg',
        upsert: false
    };
}
