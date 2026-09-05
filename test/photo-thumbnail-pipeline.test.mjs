import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
    PHOTO_THUMBNAIL_LONG_EDGE,
    PHOTO_THUMBNAIL_QUALITY,
    getPhotoThumbnailFileName,
    getPhotoThumbnailSize
} from '../js/photo-upload-optimizer.mjs';

const auth = await readFile(new URL('../auth.js', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const migration = await readFile(
    new URL('../supabase/migrations/20260905113000_add_photo_thumbnails.sql', import.meta.url),
    'utf8'
);

test('web thumbnails use a sharp but lightweight derivative', () => {
    assert.equal(PHOTO_THUMBNAIL_LONG_EDGE, 960);
    assert.equal(PHOTO_THUMBNAIL_QUALITY, 0.82);
    assert.equal(getPhotoThumbnailFileName('photo-1'), 'photo-1.jpg');
    assert.deepEqual(getPhotoThumbnailSize(4000, 3000), { width: 960, height: 720 });
    assert.deepEqual(getPhotoThumbnailSize(600, 800), { width: 600, height: 800 });
});

test('photo records persist thumbnail paths while retaining original URLs', () => {
    assert.match(auth, /PHOTO_SELECT_COLUMNS[^\n]+thumbnail_path/);
    assert.match(auth, /thumbnail_path:\s*photo\.thumbnail_path \|\| null/);
    assert.match(auth, /export async function updatePhotoThumbnailPath/);
    assert.match(app, /thumbnail_url:\s*photo\.thumbnail_url/);
    assert.match(app, /function getPhotoThumbnailSrc/);
    assert.match(app, /data-photo-variant="thumbnail"/);
    assert.match(app, /queueMissingPhotoThumbnailBackfill/);
});

test('thumbnail migration adds the database column and public storage access', () => {
    assert.match(migration, /add column if not exists thumbnail_path text/i);
    assert.match(migration, /p\.thumbnail_path = objects\.name/i);
});
