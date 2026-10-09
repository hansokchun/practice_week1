import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { cleanupLandingUploads, isLocalLandingUpload } from '../js/landing-upload-cleanup.mjs';

const upload = (id, owner = 'owner') => ({
    id, owner_id: owner, storage_path: `${owner}/landing/${id}.jpg`,
    thumbnail_path: `${owner}/thumbnails/${id}.jpg`, preview_path: `${owner}/previews/${id}.jpg`
});

test('cleanup removes only replaced owner landing uploads after database approval', async () => {
    const removed = [];
    const claimed = [];
    const rows = [upload('old'), upload('current'), upload('other', 'other'),
        { ...upload('ordinary'), storage_path: 'owner/ordinary.jpg' }, upload('referenced')];
    const result = await cleanupLandingUploads(rows, 'owner', ['current'], {
        claim: async id => {
            claimed.push(id);
            return { data: id === 'referenced' ? [] : [upload(id)], error: null };
        },
        remove: async paths => { removed.push(...paths); return { error: null }; }
    });
    assert.deepEqual(claimed, ['old', 'referenced']);
    assert.deepEqual(removed, ['owner/landing/old.jpg', 'owner/thumbnails/old.jpg', 'owner/previews/old.jpg']);
    assert.deepEqual(result.deletedIds, ['old']);
    assert.deepEqual(result.pendingPaths, []);
    assert.equal(result.error, null);
    assert.equal(isLocalLandingUpload(rows[3]), false);
});

test('failed storage removal is retained for retry and never touches another owner path', async () => {
    const error = new Error('storage unavailable');
    const result = await cleanupLandingUploads([upload('old')], 'owner', [], {
        claim: async () => ({ data: [{ ...upload('old'), thumbnail_path: 'other/thumbnail.jpg' }], error: null }),
        remove: async () => ({ error })
    });
    assert.deepEqual(result.deletedIds, ['old']);
    assert.deepEqual(result.pendingPaths, ['owner/landing/old.jpg', 'owner/previews/old.jpg']);
    assert.equal(result.error, error);
    const removed = [];
    const retried = await cleanupLandingUploads([], 'owner', [], {
        claim: async () => { throw new Error('no photo should be claimed'); },
        remove: async paths => { removed.push(...paths); return { error: null }; }
    }, result.pendingPaths);
    assert.deepEqual(removed, result.pendingPaths);
    assert.deepEqual(retried.pendingPaths, []);
});

test('failed database cleanup leaves the photo and its storage untouched', async () => {
    const error = new Error('database unavailable');
    const result = await cleanupLandingUploads([upload('old')], 'owner', [], {
        claim: async () => ({ data: null, error }),
        remove: async () => { throw new Error('storage must remain'); }
    });
    assert.deepEqual(result.deletedIds, []);
    assert.equal(result.error, error);
});

test('editor thumbnails use the shared signed URL recovery pipeline', () => {
    const app = readFileSync('js/app.js', 'utf8');
    const dock = app.slice(app.indexOf('function renderLandingAdminDock()'), app.indexOf('function selectLandingAdminTarget'));
    assert.match(dock, /renderPhotoImage\(photo/);
    assert.doesNotMatch(dock, /<img src=/);
    const save = app.slice(app.indexOf('async function saveLandingAdminForm'), app.indexOf('function getFeedbackAuthorName'));
    assert.ok(save.indexOf('cleanupLandingHeroUploads') > save.indexOf('await loadLandingCuration()'));
    assert.match(save, /cleanupError/);
});

test('metadata-only dock thumbnails recover an address instead of remaining blank', async () => {
    const source = readFileSync('js/app.js', 'utf8');
    const photo = { id: 'dock-photo', owner_id: 'owner', storage_path: 'owner/p.jpg', thumbnail_path: 'owner/thumbnails/p.jpg', url: null };
    const grid = { innerHTML: '' };
    class Image {
        dataset = {};
        isConnected = true;
        classList = { add() {} };
        src = '';
        getAttribute(name) { return name === 'src' ? this.src : null; }
        hasAttribute() { return false; }
        closest() { return null; }
    }
    let signed = 0;
    const context = {
        state: { currentUser: { id: 'owner' }, savedPhotos: [photo], landingSections: [],
            landingHeroPhotoIds: [], landingAdminTarget: 'hero', landingAdminDockQuery: '', landingAdminDockPage: 1 },
        $: selector => selector === '#landing-admin-dock-photos' ? grid : {},
        isLandingAdmin: () => true,
        getLandingAdminCandidates: () => [photo],
        getLandingAdminDockPage: photos => ({ items: photos, currentPage: 1, totalPages: 1 }),
        getLandingPhotoLabel: () => '사진', getPhotoFallbackLabel: () => '사진',
        escapeHtml: value => String(value),
        shouldRefreshPhotoSignedUrl: row => !row.signed_url_expires_at,
        HTMLImageElement: Image, photoImageUrlObserver: null,
        photoImageUrlRecoveryQueue: new Map(), photoImageUrlRecoveryTimer: null,
        window: { setTimeout: () => 1 },
        hydratePhotoUrls: async rows => {
            signed++;
            return { data: rows.map(row => ({ ...row, url: '/fresh/original', thumbnail_url: '/fresh/thumbnail',
                signed_url_expires_at: Date.now() + 900000 })), error: null };
        }
    };
    const blocks = [
        ['function getPhotoImageSrc', 'const PHOTO_THUMBNAIL_EAGER_COUNT'],
        ['function renderLandingAdminDock()', 'function selectLandingAdminTarget'],
        ['function observePhotoImageUrl', 'function preparePhotoImagesInNode'],
        ['function queuePhotoImageUrlRecovery', 'function showToast']
    ].map(([start, end]) => source.slice(source.indexOf(start), source.indexOf(end))).join('\n');
    runInNewContext(blocks, context);
    context.renderLandingAdminDock();
    const image = new Image();
    image.dataset.i = grid.innerHTML.match(/data-i="([^"]+)"/)?.[1];
    image.dataset.photoVariant = grid.innerHTML.match(/data-photo-variant="([^"]+)"/)?.[1];
    image.src = grid.innerHTML.match(/\ssrc="([^"]*)"/)?.[1] || '';
    context.observePhotoImageUrl(image);
    await context.flushPhotoImageUrlRecoveryQueue();
    assert.equal(signed, 1);
    assert.equal(image.src, '/fresh/thumbnail');
});
