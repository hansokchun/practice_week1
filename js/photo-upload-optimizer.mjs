const OPTIMIZABLE_PHOTO_TYPE = /^image\/(?:hei[cf]|jpe?g|png|webp)$/iu;

export const TARGET_PHOTO_UPLOAD_SIZE_BYTES = 3 * 1024 * 1024;
export const MAX_OPTIMIZED_PHOTO_EDGE = 3200;
export const MIN_OPTIMIZED_PHOTO_EDGE = 1600;
export const PHOTO_OPTIMIZATION_QUALITY_STEPS = [0.96, 0.93, 0.9, 0.86, 0.82, 0.76];
export const PHOTO_THUMBNAIL_LONG_EDGE = 960;
export const PHOTO_THUMBNAIL_QUALITY = 0.82;

export function shouldOptimizePhotoForUpload(file) {
    const mimeType = String(file?.type || '').toLowerCase();
    return OPTIMIZABLE_PHOTO_TYPE.test(mimeType)
        && (mimeType.startsWith('image/hei') || Number(file?.size || 0) > TARGET_PHOTO_UPLOAD_SIZE_BYTES);
}

export function getOptimizedPhotoMimeType(file) {
    return file?.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
}

export function getOptimizedPhotoFileName(name = '', mimeType = 'image/jpeg') {
    const extension = mimeType === 'image/webp' ? 'webp' : 'jpg';
    const baseName = String(name || 'optimized-photo').replace(/\.[^.]+$/, '') || 'optimized-photo';
    return `${baseName}.${extension}`;
}

export function getConstrainedPhotoSize(width, height, maxEdge = MAX_OPTIMIZED_PHOTO_EDGE) {
    const longestEdge = Math.max(Number(width) || 0, Number(height) || 0);
    if (!longestEdge || longestEdge <= maxEdge) {
        return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
    }
    const scale = maxEdge / longestEdge;
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale))
    };
}

export function getPhotoThumbnailSize(width, height) {
    return getConstrainedPhotoSize(width, height, PHOTO_THUMBNAIL_LONG_EDGE);
}

export function getPhotoThumbnailFileName(photoId) {
    return `${String(photoId || 'photo').replace(/[^a-zA-Z0-9_-]/g, '-')}.jpg`;
}

function getOptimizationEdges(width, height) {
    const longestEdge = Math.max(Number(width) || 0, Number(height) || 0);
    const firstEdge = Math.min(longestEdge || MAX_OPTIMIZED_PHOTO_EDGE, MAX_OPTIMIZED_PHOTO_EDGE);
    return [
        firstEdge,
        Math.max(MIN_OPTIMIZED_PHOTO_EDGE, Math.round(firstEdge * 0.86)),
        Math.max(MIN_OPTIMIZED_PHOTO_EDGE, Math.round(firstEdge * 0.72)),
        MIN_OPTIMIZED_PHOTO_EDGE
    ].filter((edge, index, edges) => edge && edges.indexOf(edge) === index);
}

function loadPhotoElement(file) {
    return new Promise((resolve, reject) => {
        if (typeof Image === 'undefined' || typeof URL === 'undefined') {
            reject(new Error('Image loading is not available in this browser.'));
            return;
        }
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Photo preview failed to load.'));
        };
        image.src = objectUrl;
    });
}

async function loadPhotoSource(file) {
    if (typeof createImageBitmap === 'function') {
        try {
            return await createImageBitmap(file);
        } catch (_) {
            return loadPhotoElement(file);
        }
    }
    return loadPhotoElement(file);
}

function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve) => {
        canvas.toBlob(resolve, mimeType, quality);
    });
}

function createOptimizedFile(blob, sourceFile, mimeType) {
    return new File([blob], getOptimizedPhotoFileName(sourceFile.name, mimeType), {
        type: mimeType,
        lastModified: sourceFile.lastModified || Date.now()
    });
}

export async function optimizePhotoForUpload(file) {
    if (!shouldOptimizePhotoForUpload(file)) return file;
    if (typeof document === 'undefined' || typeof File === 'undefined') return file;

    try {
        const photoSource = await loadPhotoSource(file);
        const sourceWidth = photoSource.width;
        const sourceHeight = photoSource.height;
        const mimeType = getOptimizedPhotoMimeType(file);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        let bestFile = file;

        if (!context || !sourceWidth || !sourceHeight) return file;

        for (const edge of getOptimizationEdges(sourceWidth, sourceHeight)) {
            const size = getConstrainedPhotoSize(sourceWidth, sourceHeight, edge);
            canvas.width = size.width;
            canvas.height = size.height;
            context.clearRect(0, 0, size.width, size.height);
            context.drawImage(photoSource, 0, 0, size.width, size.height);

            for (const quality of PHOTO_OPTIMIZATION_QUALITY_STEPS) {
                const blob = await canvasToBlob(canvas, mimeType, quality);
                if (!blob) continue;
                const optimizedFile = createOptimizedFile(blob, file, mimeType);
                if (optimizedFile.size < bestFile.size) bestFile = optimizedFile;
                if (optimizedFile.size <= TARGET_PHOTO_UPLOAD_SIZE_BYTES) return optimizedFile;
            }
        }

        return bestFile;
    } catch (_) {
        return file;
    }
}

export async function createPhotoThumbnailForUpload(file, photoId = 'photo') {
    if (!OPTIMIZABLE_PHOTO_TYPE.test(file?.type || '')) return null;
    if (typeof document === 'undefined' || typeof File === 'undefined') return null;

    try {
        const photoSource = await loadPhotoSource(file);
        const size = getPhotoThumbnailSize(photoSource.width, photoSource.height);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context || !size.width || !size.height) return null;

        canvas.width = size.width;
        canvas.height = size.height;
        context.drawImage(photoSource, 0, 0, size.width, size.height);
        const blob = await canvasToBlob(canvas, 'image/jpeg', PHOTO_THUMBNAIL_QUALITY);
        if (!blob) return null;
        return new File([blob], getPhotoThumbnailFileName(photoId), {
            type: 'image/jpeg',
            lastModified: file.lastModified || Date.now()
        });
    } catch (_) {
        return null;
    }
}
