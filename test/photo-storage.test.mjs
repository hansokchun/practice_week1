import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    applySignedPhotoUrls,
    getPhotoStoragePath
} from '../js/photo-storage.mjs';

const authSource = readFileSync('auth.js', 'utf8');

test('getPhotoStoragePath prefers the saved private object path', () => {
    assert.equal(
        getPhotoStoragePath({
            storage_path: 'owner-1/1710000000000-photo.jpg',
            url: 'https://example.test/storage/v1/object/public/photos/old.jpg'
        }),
        'owner-1/1710000000000-photo.jpg'
    );
});

test('getPhotoStoragePath extracts the path from a legacy public URL', () => {
    assert.equal(
        getPhotoStoragePath({
            url: 'https://project.supabase.co/storage/v1/object/public/photos/owner-1/photo.jpg?download=1'
        }),
        'owner-1/photo.jpg'
    );
});

test('applySignedPhotoUrls replaces only rows with a matching signed URL', () => {
    const photos = [
        { id: 'private', storage_path: 'owner-1/private.jpg', url: null },
        { id: 'legacy', url: 'https://legacy.example/photo.jpg' }
    ];

    const hydrated = applySignedPhotoUrls(
        photos,
        new Map([['owner-1/private.jpg', 'https://signed.example/private.jpg']])
    );

    assert.deepEqual(hydrated, [
        { id: 'private', storage_path: 'owner-1/private.jpg', url: 'https://signed.example/private.jpg' },
        { id: 'legacy', url: 'https://legacy.example/photo.jpg' }
    ]);
    assert.notEqual(hydrated[0], photos[0]);
});

test('photo persistence requests signed URLs for stored paths instead of public URLs', () => {
    assert.match(authSource, /import \{ applySignedPhotoUrls, getPhotoStoragePath \} from '\.\/js\/photo-storage\.mjs';/);
    assert.match(authSource, /createSignedUrls\(paths, 900\)/);
    assert.match(authSource, /createSignedUrl\(fileName, 900\)/);
});

test('only photo reads hydrate signed image URLs', () => {
    const profilesStart = authSource.indexOf('export async function fetchProfilesByIds');
    const photosStart = authSource.indexOf('export async function fetchPhotos');
    const upsertStart = authSource.indexOf('export async function upsertPhoto');
    const profilesBody = authSource.slice(profilesStart, photosStart);
    const photosBody = authSource.slice(photosStart, upsertStart);

    assert.doesNotMatch(profilesBody, /hydrateSignedPhotoUrls/);
    assert.match(photosBody, /await hydratePrivatePhotoLocations\(sb, data \|\| \[\]\)/);
    assert.match(photosBody, /await hydrateSignedPhotoUrls\(sb, photosWithPrivateLocations\)/);
});
