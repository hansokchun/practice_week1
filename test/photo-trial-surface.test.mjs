import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

test('header trial entry opens a labeled dialog beside the regular upload action', () => {
    const header = html.slice(html.indexOf('<header class="site-header"'), html.indexOf('</header>'));
    assert.match(header, /id="btn-header-upload"[\s\S]*id="btn-open-photo-trial"/);
    assert.match(html, /id="photo-trial-modal"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="photo-trial-title"/);
    assert.match(app, /btn-open-photo-trial[^\n]+openPhotoTrial/);
});

test('trial exposes local photo preview, selected pin editing, and an explicit account-save action', () => {
    const modal = html.slice(html.indexOf('id="photo-trial-modal"'), html.indexOf('id="auth-modal"'));
    for (const selector of ['file-input', 'count', 'image', 'list', 'map', 'map-start', 'location-save', 'continue', 'error']) {
        assert.ok(modal.includes(`data-trial-${selector}`), selector);
    }
    assert.match(modal, /서버에 업로드되지 않/);
    assert.match(modal, /최대 3장/);
    assert.doesNotMatch(modal, /data-route="upload"/);
    assert.match(app, /photo-trial:close/);
});

test('trial auth completion restores browser drafts into upload review before any server save', () => {
    const stage = app.slice(app.indexOf('async function stagePhotoTrialForUpload('), app.indexOf('async function continuePhotoTrial('));
    assert.match(stage, /loadDraft\(\)/);
    assert.match(stage, /if \(!items\) await photoTrialStore\.claimGuestDraft\(\)/);
    assert.match(stage, /buildTrialUploadPhotos/);
    assert.match(stage, /routeTo\('upload'\)/);
    assert.doesNotMatch(stage, /uploadImage\(|upsertPhoto\(|persistStagedPhotos\(/);
    assert.match(app, /action === 'save-photo-trial'[\s\S]*?await stagePhotoTrialForUpload\(\)/);
});

test('trial controller is replaced when the current account changes', () => {
    const factory = app.slice(app.indexOf('function getPhotoTrialController('), app.indexOf('async function openPhotoTrial('));
    assert.match(factory, /photoTrialOwnerId === ownerId/);
    assert.match(factory, /photoTrialController\?\.dispose\(\)/);
    assert.match(factory, /createPhotoTrialStore\(\{ ownerId \}\)/);
    assert.match(factory, /store: photoTrialStore/);
});

test('authenticated upload keeps trial positions and private visibility while retaining normal upload behavior', () => {
    const persistence = app.slice(app.indexOf('async function persistStagedPhotos()'), app.indexOf('async function saveAlbumDraft()'));
    assert.match(persistence, /getTrialUploadMetadata\(photo\.trialMetadata, extractedExif\)/);
    assert.match(persistence, /const extractedExif = photo\.trialId \? \{\} : await readPhotoExif\(photo\.file\)/);
    assert.match(persistence, /photo\.trialId \? 'private' :/);
    assert.match(persistence, /location_assignment_skipped:/);
    assert.match(persistence, /removeSaved\(savedTrialIds\)/);
});

test('trial dialog has one scrolling body and a responsive photo/map workspace', () => {
    assert.match(css, /\.photo-trial-body\s*\{[^}]*min-height: 0;[^}]*overflow-y: auto;/s);
    assert.match(css, /\.photo-trial-workspace\s*\{[^}]*grid-template-columns:/s);
    assert.match(css, /\.photo-trial-card \[hidden\]\s*\{\s*display: none/);
    assert.match(css, /@media \(max-width: 860px\)[\s\S]*\.photo-trial-workspace\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
});
