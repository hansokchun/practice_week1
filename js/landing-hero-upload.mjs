import { PHOTO_SIGNED_URL_TTL_SECONDS } from './photo-signed-url-freshness.mjs';

export async function uploadLandingHeroPhoto(file, { ownerId, id }, dependencies) {
    const paths = [];
    async function upload(uploadFile, path, variant = false) {
        paths.push(path);
        const result = await (variant ? dependencies.uploadVariant : dependencies.upload)(uploadFile, path);
        if (result.error) throw result.error;
        return result;
    }
    try {
        const optimized = await dependencies.optimize(file);
        const extension = { 'image/png': 'png', 'image/webp': 'webp' }[optimized.type] || 'jpg';
        const original = await upload(optimized, `${ownerId}/landing/${id}.${extension}`);
        const expiresAt = Date.now() + PHOTO_SIGNED_URL_TTL_SECONDS * 1000;
        const thumbnailFile = await dependencies.createThumbnail(optimized, id);
        const previewFile = await dependencies.createPreview(optimized, id);
        if (!thumbnailFile || !previewFile) throw new Error('사진 미리보기를 만들지 못했습니다.');
        const thumbnail = await upload(thumbnailFile, `${ownerId}/thumbnails/${id}.jpg`, true);
        const preview = await upload(previewFile, `${ownerId}/previews/${id}.jpg`, true);
        const record = {
            id, owner_id: ownerId, url: original.url, storage_path: original.storagePath,
            signed_url_expires_at: expiresAt,
            thumbnail_url: thumbnail.url, thumbnail_path: thumbnail.storagePath,
            preview_url: preview.url, preview_path: preview.storagePath,
            date: new Date().toISOString(), description: '', lat: null, lng: null,
            liked: 0, shared: true, visibility: 'public', geo_source: 'unknown', location_precision: 'approximate'
        };
        const { error } = await dependencies.save(record);
        if (error) throw error;
        return record;
    } catch (error) {
        await Promise.allSettled(paths.map(path => dependencies.remove(path)));
        throw error;
    }
}
