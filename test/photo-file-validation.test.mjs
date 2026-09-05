import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
    filterAcceptedPhotoFiles,
    validatePhotoFile
} from '../js/photo-file-validation.mjs';

test('validatePhotoFile accepts supported image files under the size limit', () => {
    assert.deepEqual(validatePhotoFile({ name: 'jeju.webp', type: 'image/webp', size: 1024 }), {
        accepted: true,
        reason: null
    });
});

test('validatePhotoFile accepts mobile picker JPEG aliases and extension fallback', () => {
    assert.equal(validatePhotoFile({ name: 'camera.jpg', type: 'image/jpg', size: 1024 }).accepted, true);
    assert.equal(validatePhotoFile({ name: 'google-photos.JPEG', type: '', size: 1024 }).accepted, true);
    assert.equal(validatePhotoFile({ name: 'shared.png', type: 'application/octet-stream', size: 1024 }).accepted, true);
});

test('validatePhotoFile accepts iPhone HEIC and HEIF selections', () => {
    assert.equal(validatePhotoFile({ name: 'IMG_0001.HEIC', type: 'image/heic', size: 1024 }).accepted, true);
    assert.equal(validatePhotoFile({ name: 'IMG_0002.heif', type: '', size: 1024 }).accepted, true);
});

test('validatePhotoFile rejects unsupported file types', () => {
    assert.deepEqual(validatePhotoFile({ name: 'notes.pdf', type: 'application/pdf', size: 1024 }), {
        accepted: false,
        reason: '지원하지 않는 파일 형식입니다.'
    });
});

test('validatePhotoFile does not trust an image extension over an explicit non-image MIME type', () => {
    assert.equal(validatePhotoFile({ name: 'notes.jpg', type: 'application/pdf', size: 1024 }).accepted, false);
});

test('validatePhotoFile rejects photos over 15MB', () => {
    assert.deepEqual(validatePhotoFile({ name: 'huge.jpg', type: 'image/jpeg', size: 16 * 1024 * 1024 }), {
        accepted: false,
        reason: '15MB 이하의 사진만 올릴 수 있습니다.'
    });
});

test('filterAcceptedPhotoFiles separates accepted files and rejection messages', () => {
    const image = { name: 'ok.png', type: 'image/png', size: 1024 };
    const rejected = { name: 'bad.gif', type: 'image/gif', size: 1024 };

    assert.deepEqual(filterAcceptedPhotoFiles([image, rejected]), {
        accepted: [image],
        rejected: [{ file: rejected, reason: '지원하지 않는 파일 형식입니다.' }]
    });
});

test('upload persistence optimizes large files after reading EXIF but before storage upload', () => {
    const source = readFileSync('js/app.js', 'utf8');
    const start = source.indexOf('async function persistStagedPhotos');
    const end = source.indexOf('function renderStagedPhotos', start);
    const body = source.slice(start, end);

    assert.match(source, /optimizePhotoForUpload,[\s\S]*shouldOptimizePhotoForUpload[\s\S]*from '\.\/photo-upload-optimizer\.mjs';/);
    assert.match(body, /const hasLargeUpload = selectedPhotos\.some\(\(photo\) => shouldOptimizePhotoForUpload\(photo\.file\)\)/);
    assert.ok(body.indexOf('const exif = await readPhotoExif(photo.file);') < body.indexOf('const storageFile = await optimizePhotoForUpload(photo.file);'));
    assert.match(body, /const fileName = `\$\{state\.currentUser\.id\}\/\$\{id\}-\$\{safeFileName\(storageFile\.name \|\| photo\.name\)\}`;/);
    assert.match(body, /const \{ url, storagePath, error: uploadError \} = await uploadImage\(storageFile, fileName\)/);
    assert.match(body, /createPhotoThumbnailForUpload\(storageFile, id\)/);
    assert.match(body, /storage_path: storagePath/);
});
