import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import test from 'node:test';
import { shouldRefreshPhotoSignedUrl } from '../js/photo-signed-url-freshness.mjs';
import { getPhotoDeliverySource } from '../js/photo-delivery.mjs';

const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');

test('stored photos never masquerade as a bundled sample while their signed URL is unavailable', () => {
    assert.match(app, /return photo\.url \|\| photo\.albumCoverUrl \|\| \(!photo\.storage_path && MAIN_BG_2_URL\) \|\| ''/);
});

test('database mutations cannot replace a live signed URL with the stale stored value', () => {
    const start = app.indexOf('function normalizePhotoUpdate(photo, update)');
    const end = app.indexOf('let photoAiAnalysisQueue', start);
    const body = app.slice(start, end);

    assert.match(body, /\.\.\.photo,[\s\S]*\.\.\.update,[\s\S]*url: photo\.url/);
    assert.match(body, /storage_path: update\.storage_path \|\| photo\.storage_path/);
});

test('photo surfaces recover failed signed images instead of applying the sample fallback', async () => {
    assert.match(app, /data-i=/);
    assert.match(app, /async function recoverPhotoImageUrl\(image\)/);
    assert.match(app, /hydratePhotoUrls\(\[photo\]\)/);
    assert.match(app, /photo\.url = refreshed\.url/);
    assert.match(app, /normalizePhotoUpdate\(photo, persistedPhoto\)/);
    assert.match(app, /document\.addEventListener\('error',[\s\S]*recoverPhotoImageUrl\(image\)/);
    assert.match(app, /image\.onload = \(\) => \{ resetPhotoImageRecovery\(image\); \}/);
});

test('recovery uses a partially refreshed thumbnail once and does not reschedule the same failed source', async () => {
    const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
    const imageHelpers = source.slice(source.indexOf('function getPhotoImageSrc'), source.indexOf('function renderPhotoImage'));
    const recovery = source.slice(source.indexOf('const photoImageUrlRecoveryQueue'), source.indexOf('function showToast'));
    let scheduleCount = 0;
    let hydrationCount = 0;
    const image = {
        dataset: { i: 'partial', photoVariant: 'thumbnail' },
        isConnected: true,
        src: '',
        getAttribute: (name) => name === 'src' ? image.src : '',
        closest: () => null,
        classList: { add() {} }
    };
    const context = createContext({
        Map,
        Set,
        Date,
        MAIN_BG_2_URL: '/sample.jpg',
        shouldRefreshPhotoSignedUrl,
        getPhotoDeliverySource,
        state: {
            savedPhotos: [{
                id: 'partial', storage_path: 'owner/original.jpg', thumbnail_path: 'owner/thumbnails/photo.jpg',
                url: '/expired-original', thumbnail_url: null, signed_url_expires_at: 1_000
            }]
        },
        hydratePhotoUrls: async () => {
            hydrationCount += 1;
            return {
                data: [{
                    id: 'partial', storage_path: 'owner/original.jpg', thumbnail_path: 'owner/thumbnails/photo.jpg',
                    url: null, thumbnail_url: '/fresh-thumbnail', signed_url_expires_at: Date.now() + 900_000
                }],
                error: null
            };
        },
        window: {
            setTimeout: () => {
                scheduleCount += 1;
                return 1;
            },
            clearTimeout() {}
        }
    });
    const { queuePhotoImageUrlRecovery, flushPhotoImageUrlRecoveryQueue } = runInContext(
        `${imageHelpers}; ${recovery}; ({ queuePhotoImageUrlRecovery, flushPhotoImageUrlRecoveryQueue })`,
        context
    );

    queuePhotoImageUrlRecovery(image);
    assert.equal(scheduleCount, 1);
    await flushPhotoImageUrlRecoveryQueue();

    assert.equal(hydrationCount, 1);
    assert.equal(image.src, '/fresh-thumbnail');
    assert.equal(runInContext('state.savedPhotos[0].url', context), null);
    assert.equal(runInContext('state.savedPhotos[0].thumbnail_url', context), '/fresh-thumbnail');

    queuePhotoImageUrlRecovery(image);
    assert.equal(hydrationCount, 1);
    assert.equal(scheduleCount, 1);
});

test('a failed thumbnail uses its healthy preview before one bounded signing refresh', async () => {
    const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
    const imageHelpers = source.slice(source.indexOf('function getPhotoImageSrc'), source.indexOf('function renderPhotoImage'));
    const recovery = source.slice(source.indexOf('const photoImageUrlRecoveryQueue'), source.indexOf('function showToast'));
    let scheduleCount = 0;
    let hydrationCount = 0;
    const image = {
        dataset: { i: 'alternate', photoVariant: 'thumbnail' },
        isConnected: true,
        src: '/failed-thumbnail',
        getAttribute: (name) => name === 'src' ? image.src : '',
        closest: () => null,
        classList: { add() {} }
    };
    const context = createContext({
        Map,
        Set,
        WeakMap,
        Date,
        MAIN_BG_2_URL: '/sample.jpg',
        shouldRefreshPhotoSignedUrl,
        getPhotoDeliverySource,
        state: {
            savedPhotos: [{
                id: 'alternate', storage_path: 'owner/original.jpg', thumbnail_path: 'owner/thumbnails/photo.jpg',
                preview_path: 'owner/previews/photo.jpg', url: '/original', thumbnail_url: '/failed-thumbnail',
                preview_url: '/healthy-preview', signed_url_expires_at: Date.now() + 900_000
            }]
        },
        hydratePhotoUrls: async () => {
            hydrationCount += 1;
            return { data: [], error: null };
        },
        window: {
            setTimeout: () => {
                scheduleCount += 1;
                return 1;
            },
            clearTimeout() {}
        }
    });
    const { recoverPhotoImageUrl, flushPhotoImageUrlRecoveryQueue } = runInContext(
        `${imageHelpers}; ${recovery}; ({ recoverPhotoImageUrl, flushPhotoImageUrlRecoveryQueue })`,
        context
    );

    await recoverPhotoImageUrl(image);
    assert.equal(image.src, '/healthy-preview');
    assert.equal(scheduleCount, 0);

    image.src = '/healthy-preview';
    await recoverPhotoImageUrl(image);
    assert.equal(scheduleCount, 1);
    await flushPhotoImageUrlRecoveryQueue();
    assert.equal(hydrationCount, 1);

    await recoverPhotoImageUrl(image);
    assert.equal(scheduleCount, 1);
    assert.equal(hydrationCount, 1);
});

test('personal-library recovery can use an original-only refreshed response', async () => {
    const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
    const imageHelpers = source.slice(source.indexOf('function getPhotoImageSrc'), source.indexOf('function renderPhotoImage'));
    const recovery = source.slice(source.indexOf('const photoImageUrlRecoveryQueue'), source.indexOf('function showToast'));
    const image = {
        dataset: { i: 'library', photoVariant: 'thumbnail' },
        isConnected: true,
        src: '',
        getAttribute: (name) => name === 'src' ? image.src : '',
        closest: (selector) => selector === '.personal-photo-card' ? {} : null,
        classList: { add() {} }
    };
    const context = createContext({
        Map,
        Set,
        WeakMap,
        Date,
        MAIN_BG_2_URL: '/sample.jpg',
        shouldRefreshPhotoSignedUrl,
        getPhotoDeliverySource,
        state: {
            savedPhotos: [{
                id: 'library', storage_path: 'owner/original.jpg', thumbnail_path: 'owner/thumbnails/photo.jpg',
                preview_path: 'owner/previews/photo.jpg', url: null, thumbnail_url: null, preview_url: null
            }]
        },
        hydratePhotoUrls: async () => ({
            data: [{
                id: 'library', storage_path: 'owner/original.jpg', thumbnail_path: 'owner/thumbnails/photo.jpg',
                preview_path: 'owner/previews/photo.jpg', url: '/fresh-original', thumbnail_url: null,
                preview_url: null, signed_url_expires_at: Date.now() + 900_000
            }],
            error: null
        }),
        window: { setTimeout: () => 1, clearTimeout() {} }
    });
    const { queuePhotoImageUrlRecovery, flushPhotoImageUrlRecoveryQueue } = runInContext(
        `${imageHelpers}; ${recovery}; ({ queuePhotoImageUrlRecovery, flushPhotoImageUrlRecoveryQueue })`,
        context
    );

    queuePhotoImageUrlRecovery(image);
    await flushPhotoImageUrlRecoveryQueue();

    assert.equal(image.src, '/fresh-original');
});
