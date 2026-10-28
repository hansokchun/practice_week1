import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('js/app.js', 'utf8');
const section = (start, end) => app.slice(app.indexOf(start), app.indexOf(end, app.indexOf(start) + start.length));

test('guest trial continues to local upload review without opening authentication', () => {
    const continuation = section('async function continuePhotoTrial(', 'async function persistStagedPhotos(');
    assert.match(continuation, /await stagePhotoTrialForUpload\(items\)/);
    assert.doesNotMatch(continuation, /openModal\('#auth-modal'\)/);
});

test('guest final upload persists intent and selected IDs before showing login', () => {
    const upload = section('async function persistStagedPhotos(', 'async function saveAlbumDraft(');
    assert.match(upload, /setPendingAuthAction\(state, 'persist-photo-trial'\)/);
    assert.match(upload, /pendingPhotoTrialIds/);
    assert.match(upload, /storePendingAuthContext/);
    assert.match(upload, /setAuthMode\('login'\)/);
    assert.match(upload, /openAccountProfilePage\(\)/);
});

test('auth return restores persisted trial selection and uploads before handling generic navigation', () => {
    const pending = section('async function runPendingAuthAction(', 'function bindEvents(');
    assert.match(pending, /action === 'persist-photo-trial'/);
    assert.ok(pending.indexOf("action === 'persist-photo-trial'") < pending.indexOf('if (route)'));
    assert.match(pending, /await stagePhotoTrialForUpload\(null, \{ selectedIds: state\.pendingPhotoTrialIds \}\)/);
    assert.match(pending, /await persistStagedPhotos\(\)/);
});

test('refresh restores a guest draft before guarded upload routing and retains unauthenticated intent', () => {
    assert.match(app, /consume: Boolean\(state\.currentUser\)/);
    assert.match(app, /await restoreGuestPhotoTrialReview\(\)/);
    assert.match(app, /hasGuestPhotoTrial: isGuestPhotoTrialUpload\(state\.stagedPhotos\)/);
});

test('member header can resume only the current account unfinished photos', () => {
    const entry = section('async function openHeaderUpload(', 'async function openPhotoTrial(');
    assert.match(entry, /await getPhotoTrialController\(\)\.loadDraft\(\)/);
    assert.match(entry, /await openPhotoTrial\(\)/);
    assert.match(entry, /routeTo\('upload'\)/);
    assert.doesNotMatch(entry, /claimGuestDraft|persistStagedPhotos/);
});
