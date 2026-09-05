import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync('js/app.js', 'utf8');
const authSource = readFileSync('auth.js', 'utf8');
const migrationSource = readFileSync(
    'supabase/migrations/20260725003000_defer_photo_private_location_fk.sql',
    'utf8'
);

test('photo upload removes the object when signed URL creation fails', () => {
    const uploadStart = authSource.indexOf('export async function uploadImage');
    const uploadBody = authSource.slice(uploadStart);

    assert.match(authSource, /export async function removeUploadedImage\(storagePath\)/);
    assert.match(uploadBody, /if \(uploadedPath\) await removeUploadedImage\(uploadedPath\);/);
});

test('photo upload batch compensates storage and database writes after a failure', () => {
    const persistStart = appSource.indexOf('async function persistStagedPhotos()');
    const persistEnd = appSource.indexOf('async function saveAlbumDraft()', persistStart);
    const persistBody = appSource.slice(persistStart, persistEnd);

    assert.match(persistBody, /let pendingStoragePaths = \[\];/);
    assert.match(persistBody, /pendingStoragePaths = \[storagePath\];/);
    assert.match(persistBody, /Promise\.all\(pendingStoragePaths\.map\(\(path\) => removeUploadedImage\(path\)\)\)/);
    assert.match(persistBody, /await deletePhoto\(record\.id, record\.url, record\.storage_path, record\.thumbnail_path\)/);
});

test('private location foreign key is deferred until the photo insert completes', () => {
    assert.match(
        migrationSource,
        /foreign key \(photo_id\)\s+references public\.photos\(id\)\s+on delete cascade\s+deferrable initially deferred/i
    );
});
