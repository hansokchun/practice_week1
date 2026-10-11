import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import test from 'node:test';
import { shouldRefreshPhotoSignedUrl } from '../js/photo-signed-url-freshness.mjs';
import { getPhotoDeliverySource } from '../js/photo-delivery.mjs';

const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const imageHelpers = app.slice(app.indexOf('function getPhotoImageSrc'), app.indexOf('function renderPhotoImage'));
const recovery = app.slice(app.indexOf('const photoImageUrlRecoveryQueue'), app.indexOf('function showToast'));

function createRecoveryHarness(hydrate, photoOverrides = {}) {
    const timers = new Map();
    let timerId = 0;
    const state = {
        currentUser: { id: 'owner' },
        savedPhotos: [{ id: 'photo', storage_path: 'owner/original.jpg', thumbnail_path: 'owner/thumb.jpg', ...photoOverrides }]
    };
    const context = createContext({
        state, shouldRefreshPhotoSignedUrl, getPhotoDeliverySource, MAIN_BG_2_URL: '/sample.jpg',
        hydratePhotoUrls: hydrate,
        window: {
            setTimeout(callback, delay) { timers.set(++timerId, { callback, delay }); return timerId; },
            clearTimeout(id) { timers.delete(id); }
        }
    });
    const api = runInContext(`${imageHelpers}; ${recovery}; ({
        queuePhotoImageUrlRecovery, flushPhotoImageUrlRecoveryQueue, recoverPhotoImageUrl,
        resetPhotoImageRecovery
    })`, context);
    return {
        ...api, state, timers,
        async runTimer(delay) {
            const entry = [...timers].find(([, timer]) => timer.delay === delay);
            assert.ok(entry, `expected a ${delay}ms timer`);
            timers.delete(entry[0]);
            entry[1].callback();
            await new Promise(resolve => setImmediate(resolve));
        }
    };
}

function recoveryImage() {
    const classes = new Set();
    const image = {
        dataset: { i: 'photo', photoVariant: 'thumbnail' }, isConnected: true, src: '',
        getAttribute: name => name === 'src' ? image.src : '', closest: () => null,
        classList: { add: value => classes.add(value), contains: value => classes.has(value) }
    };
    return image;
}

function freshRecoveryResult() {
    return { data: [{ id: 'photo', storage_path: 'owner/original.jpg', thumbnail_path: 'owner/thumb.jpg',
        thumbnail_url: '/fresh-thumb', signed_url_expires_at: Date.now() + 900_000 }], error: null };
}

test('duplicate photo nodes join the pending signing request and both receive the fresh URL', async () => {
    let complete;
    let calls = 0;
    const harness = createRecoveryHarness(() => {
        calls += 1;
        return new Promise(resolve => { complete = resolve; });
    });
    const first = recoveryImage();
    const second = recoveryImage();
    harness.queuePhotoImageUrlRecovery(first);
    const pending = harness.flushPhotoImageUrlRecoveryQueue();
    harness.queuePhotoImageUrlRecovery(second);
    complete(freshRecoveryResult());
    await pending;
    assert.equal(calls, 1);
    assert.equal(first.src, '/fresh-thumb');
    assert.equal(second.src, '/fresh-thumb');
});

test('a transient signing outage retries and recovers without page reload', async () => {
    let calls = 0;
    const harness = createRecoveryHarness(async () => ++calls === 1
        ? { error: { status: 503 } } : freshRecoveryResult());
    const image = recoveryImage();
    harness.queuePhotoImageUrlRecovery(image);
    await harness.runTimer(0);
    assert.equal(image.src, '');
    await harness.runTimer(1000);
    await harness.runTimer(0);
    assert.equal(image.src, '/fresh-thumb');
    image.onload();
    assert.equal(harness.timers.size, 0);
});

test('automatic retries are bounded and do not retry permission failures', async () => {
    for (const status of [503, 403]) {
        let calls = 0;
        const harness = createRecoveryHarness(async () => { calls += 1; return { error: { status } }; });
        harness.queuePhotoImageUrlRecovery(recoveryImage());
        await harness.runTimer(0);
        if (status === 503) {
            await harness.runTimer(1000);
            await harness.runTimer(0);
            await harness.runTimer(2000);
            await harness.runTimer(0);
        }
        assert.equal(calls, status === 503 ? 3 : 1);
        assert.equal(harness.timers.size, 0);
    }
});

test('pending retries do not follow detached images or a changed session', async () => {
    for (const change of ['detach', 'session']) {
        let calls = 0;
        const harness = createRecoveryHarness(async () => { calls += 1; return { error: { status: 503 } }; });
        const image = recoveryImage();
        harness.queuePhotoImageUrlRecovery(image);
        await harness.runTimer(0);
        if (change === 'detach') image.isConnected = false;
        else harness.state.currentUser = { id: 'other' };
        await harness.runTimer(1000);
        assert.equal(calls, 1);
        assert.equal(harness.timers.size, 0);
    }
});

test('an in-flight signed response cannot overwrite a different session or replaced photo file', async () => {
    for (const change of ['session', 'file']) {
        let complete;
        const harness = createRecoveryHarness(() => new Promise(resolve => { complete = resolve; }));
        const image = recoveryImage();
        harness.queuePhotoImageUrlRecovery(image);
        const pending = harness.flushPhotoImageUrlRecoveryQueue();
        if (change === 'session') harness.state.currentUser = { id: 'other' };
        else harness.state.savedPhotos[0].thumbnail_path = 'owner/replaced-thumb.jpg';
        complete(freshRecoveryResult());
        await pending;
        assert.equal(image.src, '');
        assert.equal(harness.state.savedPhotos[0].thumbnail_url, undefined);
    }
});

test('expired variants are renewed instead of cycling through expired alternatives', async () => {
    const harness = createRecoveryHarness(async () => freshRecoveryResult(), {
        thumbnail_url: '/expired-thumb', preview_url: '/expired-preview', signed_url_expires_at: 1000
    });
    const image = recoveryImage();
    image.src = '/expired-thumb';
    await harness.recoverPhotoImageUrl(image);
    assert.equal(image.src, '/expired-thumb');
    await harness.runTimer(0);
    assert.equal(image.src, '/fresh-thumb');
});

test('album-cover recovery permits the original-only response without enabling it on recommendation cards', async () => {
    const harness = createRecoveryHarness(async () => ({ data: [{
        ...freshRecoveryResult().data[0], thumbnail_url: null, url: '/fresh-original'
    }], error: null }));
    const cover = recoveryImage();
    cover.dataset.photoAllowOriginal = 'true';
    const recommendation = recoveryImage();
    recommendation.closest = selector => selector === '.landing-photo-card' ? {} : null;
    harness.queuePhotoImageUrlRecovery(cover);
    harness.queuePhotoImageUrlRecovery(recommendation);
    await harness.runTimer(0);
    assert.equal(cover.src, '/fresh-original');
    assert.equal(recommendation.src, '');
});

test('stored photos never masquerade as a bundled sample while their signed URL is unavailable', () => {
    assert.match(app, /return photo\.url \|\| photo\.albumCoverUrl \|\| \(!photo\.storage_path && MAIN_BG_2_URL\) \|\| ''/);
});

test('album detail and missing-location thumbnails retain photo identity for common recovery', () => {
    const albumCard = app.slice(app.indexOf('function renderTripReviewPhotoCard('), app.indexOf('function renderTripReviewPhotoFlow('));
    assert.match(albumCard, /renderPhotoImage\(photo, albumTitle, \{ allowOriginal: true \}\)/);
    assert.doesNotMatch(albumCard, /photo\.url \|\| cover/);
    const missing = app.slice(app.indexOf('function renderMissingLocationTasks('), app.indexOf('function formatLocationAssignmentDate('));
    assert.match(missing, /renderPhotoImage\(photo, '', \{ allowOriginal: true \}\)/);
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
