import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAlbumCoverPhotos } from '../js/album-cover-photos.mjs';

const url = path => `https://project.supabase.co/storage/v1/object/sign/photos/${path}?token=expired`;
const photos = [
    { id: 'one', album_id: 'album', storage_path: 'owner/one.jpg', thumbnail_path: 'owner/one-thumb.jpg' },
    { id: 'two', album_id: 'album', storage_path: 'owner/two.jpg', thumbnail_path: 'owner/two-thumb.jpg' },
    { id: 'other', album_id: 'other-album', storage_path: 'owner/other.jpg' }
];

test('album covers resolve expired original URLs to real photo records before loading', () => {
    assert.deepEqual(getAlbumCoverPhotos({ id: 'album', cover_url: url('owner/two.jpg') }, photos), [photos[1], photos[0]]);
});

test('album covers stored as thumbnail URLs retain their recoverable photo identity', () => {
    assert.deepEqual(getAlbumCoverPhotos({ id: 'album', cover_url: url('owner/two-thumb.jpg') }, photos), [photos[1], photos[0]]);
});

test('unhydrated album photos can produce covers without downloading the originals', () => {
    assert.deepEqual(getAlbumCoverPhotos({ id: 'album', cover_url: null }, photos), photos.slice(0, 2));
    assert.deepEqual(getAlbumCoverPhotos({ id: 'empty', cover_url: null }, photos), []);
});

test('a removed cover falls back only to photos in the same album', () => {
    assert.deepEqual(getAlbumCoverPhotos({ id: 'album', cover_url: url('owner/deleted.jpg') }, photos), photos.slice(0, 2));
});
