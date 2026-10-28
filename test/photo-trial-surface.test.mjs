import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

test('header uses one map-create action and a separate dismissible invitation', () => {
    const header = html.slice(html.indexOf('<header class="site-header"'), html.indexOf('</header>'));
    assert.match(header, /id="btn-header-upload"[^>]*aria-label="내 지도 만들기"/);
    assert.match(header, /id="header-upload-label">내 지도 만들기<\/span>/);
    assert.doesNotMatch(header, /id="btn-open-photo-trial"/);
    assert.doesNotMatch(header.match(/<button id="btn-header-upload"[^>]*>/)?.[0] || '', /data-route=/);
    assert.match(header, /id="guest-map-invitation"[^>]*hidden/);
    assert.match(header, /id="btn-dismiss-guest-map-invitation"[^>]*aria-label="지도 만들기 안내 닫기"/);
    assert.match(header, /나만 아는 장소로 지도를 만들어보세요!/);
    assert.match(html, /id="photo-trial-modal"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="photo-trial-title"/);
    assert.match(css, /body\[data-page="landing"\] #guest-map-invitation\s*\{\s*display: none;/);
    assert.match(css, /\.guest-map-invitation\s*\{[^}]*background: var\(--coral\)/s);
});

test('trial exposes local photo preview, selected pin editing, and an explicit account-save action', () => {
    const modal = html.slice(html.indexOf('id="photo-trial-modal"'), html.indexOf('id="auth-modal"'));
    for (const selector of ['file-input', 'count', 'image', 'list', 'map', 'map-start', 'location-save', 'continue', 'error']) {
        assert.ok(modal.includes(`data-trial-${selector}`), selector);
    }
    assert.match(modal, /<h2 id="photo-trial-title">사진으로 내 지도를 만들어보세요<\/h2>/);
    assert.match(modal, /data-trial-count>0\/3</);
    assert.match(modal, /data-trial-continue-label>내 보관함에 저장하기</);
    assert.doesNotMatch(modal, /가입 전에 가볍게|사진 최대 3장으로|저장하고 싶을 때|내 기기의 사진을|마음에 들면|가입 후 내 보관함|브라우저에만 임시 보관|사진 속 위치 정보도 확인|체험 사진 비우기|photo-trial-privacy/);
    assert.doesNotMatch(modal, /data-route="upload"/);
    assert.match(app, /photo-trial:close/);
});

test('photo picker and save controls align their icon and label together', () => {
    assert.match(css, /\.photo-trial-picker \[data-trial-add\],\s*\.photo-trial-footer \[data-trial-continue\]\s*\{[^}]*display: inline-flex;[^}]*align-items: center;[^}]*justify-content: center;[^}]*gap: 8px;/s);
});

test('trial auth completion restores browser drafts into upload review before any server save', () => {
    const stage = app.slice(app.indexOf('async function stagePhotoTrialForUpload('), app.indexOf('async function continuePhotoTrial('));
    assert.match(stage, /loadDraft\(\)/);
    assert.match(stage, /if \(!items && state\.currentUser\) await photoTrialStore\.claimGuestDraft\(\)/);
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
