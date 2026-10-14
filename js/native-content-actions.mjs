import { isNativeApp } from './native-app-runtime.mjs';

const PUBLIC_SHARE_HOSTS = new Set(['ikkyee.com', 'dev.practice-week1-cws.pages.dev']);
const IMAGE_EXTENSIONS = Object.freeze({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' });
const MAX_PHOTO_BYTES = 50 * 1024 * 1024;
const ERROR_MESSAGES = Object.freeze({
    NATIVE_SHARE_URL: '공유할 사진 또는 앨범 링크를 확인하지 못했습니다.',
    NATIVE_SHARE_FAILED: '공유창을 열지 못했습니다. 다시 시도해주세요.',
    NATIVE_PHOTO_SIZE: '50MB 이하의 사진만 저장할 수 있습니다.',
    NATIVE_PHOTO_TYPE: '저장할 사진 형식을 확인하지 못했습니다.',
    NATIVE_PHOTO_READ: '사진을 준비하지 못했습니다. 다시 시도해주세요.',
    NATIVE_PHOTO_SAVE: '사진 저장창을 열지 못했습니다. 다시 시도해주세요.'
});

function actionError(code) {
    const error = new Error(ERROR_MESSAGES[code]);
    error.code = code;
    return error;
}

function unsupportedResult() {
    return { handled: false, data: null, error: null };
}

function failedResult(code) {
    return { handled: true, data: null, error: actionError(code) };
}

function isShareCancellation(error) {
    return error?.name === 'AbortError'
        || /^(?:USER_CANCELLED|USER_CANCELED|CANCELLED|CANCELED)$/i.test(String(error?.code || ''))
        || /^(?:Share|User) cancel(?:ed|led)$/i.test(String(error?.message || ''));
}

function safeText(value, maxLength, fallback = '') {
    return typeof value === 'string'
        ? value.normalize('NFC').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, '').slice(0, maxLength)
        : fallback;
}

function getPublicShareUrl(value) {
    if (typeof value !== 'string' || value.length > 4096 || /[\s\u0000-\u001f\u007f\\]/u.test(value)) return null;
    let url;
    try {
        url = new URL(value);
    } catch {
        return null;
    }
    const authority = value.match(/^https:\/\/([^/?#]+)\//i)?.[1]?.toLowerCase();
    if (url.protocol !== 'https:' || !PUBLIC_SHARE_HOSTS.has(authority)
        || !PUBLIC_SHARE_HOSTS.has(url.hostname)
        || url.username || url.password || url.port || url.hash
        || !/^\/share\/(?:photo|album)\/[A-Za-z0-9_-]{1,128}$/.test(url.pathname)) return null;
    const credentialKeys = /^(?:access_token|refresh_token|id_token|token|token_hash|code|password|secret|authorization|api_?key)$/i;
    if ([...url.searchParams.keys()].some((key) => credentialKeys.test(key))) return null;
    return url.href;
}

async function loadDefaultShare() {
    const { Share } = await import('@capacitor/share');
    return Share;
}

async function loadDefaultFilesystem() {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    return { Filesystem, Directory };
}

/** Web callers receive handled:false and can keep their existing browser flow. */
export async function shareNativeContent(content, {
    capacitor = globalThis.Capacitor,
    loadShare = loadDefaultShare
} = {}) {
    if (!isNativeApp(capacitor)) return unsupportedResult();
    const url = getPublicShareUrl(content?.url);
    if (!url) return failedResult('NATIVE_SHARE_URL');
    try {
        const share = await loadShare();
        await share.share({
            title: safeText(content?.title, 240, 'Ikkyee'),
            text: safeText(content?.text || content?.description, 2000),
            url,
            dialogTitle: '공유하기'
        });
        return { handled: true, data: { status: 'shared' }, error: null };
    } catch (error) {
        return isShareCancellation(error)
            ? { handled: true, data: { status: 'cancelled' }, error: null }
            : failedResult('NATIVE_SHARE_FAILED');
    }
}

function getPhotoFileName(value, extension) {
    const stem = String(value || '')
        .normalize('NFKC')
        .replace(/\.(?:jpe?g|png|webp)$/i, '')
        .replace(/[^A-Za-z0-9가-힣._-]+/gu, '-')
        .replace(/\.{2,}/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-._]+|[-._]+$/g, '')
        .slice(0, 48)
        .replace(/[-._]+$/g, '');
    return `${stem || 'ikkyee-photo'}.${extension}`;
}

let fallbackIdCounter = 0;
function createCacheId() {
    if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
    fallbackIdCounter += 1;
    return `${Date.now().toString(36)}-${fallbackIdCounter.toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

async function readDefaultBlob(blob) {
    if (typeof globalThis.FileReader === 'function') {
        return new Promise((resolve, reject) => {
            const reader = new globalThis.FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(actionError('NATIVE_PHOTO_READ'));
            reader.onabort = () => reject(actionError('NATIVE_PHOTO_READ'));
            reader.readAsDataURL(blob);
        });
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const chunks = [];
    for (let offset = 0; offset < bytes.length; offset += 32768) {
        chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 32768)));
    }
    return globalThis.btoa(chunks.join(''));
}

function getBase64Photo(value, mimeType) {
    if (typeof value !== 'string') throw actionError('NATIVE_PHOTO_READ');
    let data = value;
    if (value.startsWith('data:')) {
        const prefix = `data:${mimeType};base64,`;
        if (!value.startsWith(prefix)) throw actionError('NATIVE_PHOTO_READ');
        data = value.slice(prefix.length);
    }
    if (!data || data.length > Math.ceil(MAX_PHOTO_BYTES / 3) * 4
        || data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
        throw actionError('NATIVE_PHOTO_READ');
    }
    return data;
}

/**
 * The caller prepares photo bytes (including any requested EXIF) before this
 * bridge writes them. OS share completion does not prove a gallery save.
 */
export async function saveNativePhoto(blob, fileName, {
    capacitor = globalThis.Capacitor,
    loadFilesystem = loadDefaultFilesystem,
    loadShare = loadDefaultShare,
    readBlob = readDefaultBlob
} = {}) {
    if (!isNativeApp(capacitor)) return unsupportedResult();
    if (!Number.isFinite(blob?.size) || blob.size <= 0 || blob.size > MAX_PHOTO_BYTES) {
        return failedResult('NATIVE_PHOTO_SIZE');
    }
    const extension = IMAGE_EXTENSIONS[blob?.type];
    if (!extension) return failedResult('NATIVE_PHOTO_TYPE');

    let safeName;
    let data;
    try {
        safeName = getPhotoFileName(fileName, extension);
        data = getBase64Photo(await readBlob(blob), blob.type);
    } catch {
        return failedResult('NATIVE_PHOTO_READ');
    }

    const path = `downloads/${createCacheId()}/${safeName}`;
    try {
        const { Filesystem, Directory } = await loadFilesystem();
        await Filesystem.writeFile({ path, data, directory: Directory.Cache, recursive: true });
        const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
        if (typeof uri !== 'string' || !uri.startsWith('file://')) throw actionError('NATIVE_PHOTO_SAVE');
        const share = await loadShare();
        try {
            await share.share({ title: safeName, files: [uri], dialogTitle: '사진 저장 또는 공유' });
        } catch (error) {
            if (!isShareCancellation(error)) throw error;
            return { handled: true, data: { status: 'cancelled', fileName: safeName }, error: null };
        }
        // Recipients may read the cache URI after the share sheet closes.
        // Keep the file; platform cache eviction can reclaim it later.
        return { handled: true, data: { status: 'shared', fileName: safeName }, error: null };
    } catch {
        return failedResult('NATIVE_PHOTO_SAVE');
    }
}
