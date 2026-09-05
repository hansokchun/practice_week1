import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    applyPhotoUrlsToAlbumCovers,
    applySignedAlbumCoverUrls,
    applySignedPhotoUrls,
    getPhotoStoragePath,
    getPhotoThumbnailStoragePath
} from '../js/photo-storage.mjs';

const authSource = readFileSync('auth.js', 'utf8');
const appSource = readFileSync('js/app.js', 'utf8');

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

test('getPhotoStoragePath extracts the path from an expiring signed URL', () => {
    assert.equal(
        getPhotoStoragePath({
            url: 'https://project.supabase.co/storage/v1/object/sign/photos/owner-1/photo.jpg?token=secret'
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

test('photo thumbnail storage paths remain separate from downloadable originals', () => {
    assert.equal(
        getPhotoThumbnailStoragePath({ thumbnail_path: 'owner-1/thumbnails/photo-1.jpg' }),
        'owner-1/thumbnails/photo-1.jpg'
    );
    assert.equal(getPhotoThumbnailStoragePath({ storage_path: 'owner-1/original.jpg' }), null);

    assert.deepEqual(
        applySignedPhotoUrls(
            [{
                id: 'photo-1',
                storage_path: 'owner-1/original.jpg',
                thumbnail_path: 'owner-1/thumbnails/photo-1.jpg',
                url: null
            }],
            new Map([
                ['owner-1/original.jpg', 'https://signed.example/original.jpg'],
                ['owner-1/thumbnails/photo-1.jpg', 'https://signed.example/thumbnail.jpg']
            ])
        ),
        [{
            id: 'photo-1',
            storage_path: 'owner-1/original.jpg',
            thumbnail_path: 'owner-1/thumbnails/photo-1.jpg',
            url: 'https://signed.example/original.jpg',
            thumbnail_url: 'https://signed.example/thumbnail.jpg'
        }]
    );
});

test('applySignedAlbumCoverUrls replaces legacy album covers with signed URLs', () => {
    const albums = [
        {
            id: 'album-1',
            cover_url: 'https://project.supabase.co/storage/v1/object/public/photos/owner-1/cover.jpg'
        }
    ];

    assert.deepEqual(
        applySignedAlbumCoverUrls(
            albums,
            new Map([['owner-1/cover.jpg', 'https://signed.example/cover.jpg']])
        ),
        [{ id: 'album-1', cover_url: 'https://signed.example/cover.jpg' }]
    );
});

test('applyPhotoUrlsToAlbumCovers reconciles album covers after parallel reads', () => {
    const albums = [{
        id: 'album-1',
        cover_url: 'https://project.supabase.co/storage/v1/object/public/photos/owner-1/cover.jpg'
    }];
    const photos = [{
        id: 'photo-1',
        storage_path: 'owner-1/cover.jpg',
        url: 'https://project.supabase.co/storage/v1/object/sign/photos/owner-1/cover.jpg?token=fresh'
    }];

    assert.deepEqual(applyPhotoUrlsToAlbumCovers(albums, photos), [{
        id: 'album-1',
        cover_url: photos[0].url
    }]);
});

test('photo persistence requests signed URLs for stored paths instead of public URLs', () => {
    assert.match(authSource, /applySignedAlbumCoverUrls/);
    assert.match(authSource, /applySignedPhotoUrls/);
    assert.match(authSource, /getPhotoStoragePath/);
    assert.match(authSource, /createSignedUrls\(paths, 900\)/);
    assert.match(authSource, /createSignedUrl\(fileName, 900\)/);
});

test('photo reads can return map metadata before hydrating signed image URLs', () => {
    const profilesStart = authSource.indexOf('export async function fetchProfilesByIds');
    const photosStart = authSource.indexOf('export async function fetchPhotos');
    const upsertStart = authSource.indexOf('export async function upsertPhoto');
    const profilesBody = authSource.slice(profilesStart, photosStart);
    const photosBody = authSource.slice(photosStart, upsertStart);
    const albumsStart = authSource.indexOf('export async function fetchAlbums');
    const createAlbumStart = authSource.indexOf('export async function createAlbum');
    const albumsBody = authSource.slice(albumsStart, createAlbumStart);

    assert.doesNotMatch(profilesBody, /hydrateSignedPhotoUrls/);
    assert.doesNotMatch(authSource, /hydratePrivatePhotoLocations/);
    assert.match(photosBody, /hydrateUrls = true/);
    assert.match(photosBody, /if \(!hydrateUrls\) return \{ data: data \|\| \[\], error: null \}/);
    assert.match(photosBody, /await hydrateSignedPhotoUrls\(sb, data \|\| \[\]\)/);
    assert.match(photosBody, /export async function hydratePhotoUrls\(photos = \[\]\)/);
    assert.match(albumsBody, /await hydrateSignedAlbumCoverUrls\(sb, data \|\| \[\]\)/);
    assert.match(authSource, /hydrateSignedAlbumCoverUrls/);
    assert.match(appSource, /state\.savedAlbums = applyPhotoUrlsToAlbumCovers\(state\.savedAlbums, state\.savedPhotos\)/);
});
