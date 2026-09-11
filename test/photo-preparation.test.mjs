import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const body = app.slice(app.indexOf('async function prepareMyPhotoDerivatives()'), app.indexOf('async function loadSavedPhotos'));
function harness(fail = false) {
    const state = { currentUser: { id: 'owner' }, hasLoadedSavedPhotos: true, landingHeroPhotoIds: [], landingAssignments: [], savedPhotos: [
        { id: 'other', owner_id: 'other', storage_path: 'other/a' },
        ...Array.from({ length: 5 }, (_, i) => ({ id: String(i), owner_id: 'owner', storage_path: `owner/${i}` }))
    ] };
    const calls = [];
    const button = { disabled: false };
    const status = { textContent: '' };
    const run = runInNewContext(`${body}; prepareMyPhotoDerivatives`, {
        state, $: id => id.endsWith('status') ? status : button,
        hydratePhotoUrls: async photos => {
            calls.push(photos[0].id);
            return fail ? { error: new Error('blocked') } : { data: [{ url: '/source' }] };
        },
        createAndStorePhotoDerivatives: async photo => { photo.thumbnail_path = 'ready'; },
        renderLandingSections() {}, renderLandingHeroSlides() {}
    });
    return { run, calls, state, status, button };
}

test('explicit preparation is owner-only, capped at three, and skips completed thumbnails', async () => {
    const h = harness();
    await h.run();
    assert.deepEqual(h.calls, ['0', '1', '2']);
    await h.run();
    assert.deepEqual(h.calls, ['0', '1', '2', '3', '4']);
    assert.equal(h.button.disabled, false);
});

test('quota errors stop the batch on the first request without retrying', async () => {
    const h = harness(true);
    await h.run();
    assert.equal(h.calls.length, 1);
    assert.match(h.status.textContent, /중단/);
    assert.equal(h.button.disabled, false);
    assert.equal(h.state.isThumbnailBackfillRunning, false);
});
