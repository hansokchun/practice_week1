import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

test('header keeps one map-create action and its trial without a promotional popup', () => {
    const header = html.slice(html.indexOf('<header class="site-header"'), html.indexOf('</header>'));
    assert.match(header, /id="btn-header-upload"[^>]*aria-label="나만의 지도 만들기"/);
    assert.match(header, /id="header-upload-label">나만의 지도 만들기<\/span>/);
    assert.match(header, /id="header-upload-icon"[^>]*aria-hidden="true">map<\/span>/);
    assert.match(header, /id="header-map-dot"[^>]*aria-hidden="true"[^>]*hidden/);
    assert.doesNotMatch(header, /guest-map-invitation|id="btn-open-photo-trial"/);
    assert.doesNotMatch(header.match(/<button id="btn-header-upload"[^>]*>/)?.[0] || '', /data-route=/);
    assert.match(html, /id="photo-trial-modal"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="photo-trial-title"/);
});

test('trial exposes local photo preview, selected pin editing, and an explicit account-save action', () => {
    const modal = html.slice(html.indexOf('id="photo-trial-modal"'), html.indexOf('id="auth-modal"'));
    for (const selector of ['file-input', 'count', 'image', 'list', 'map', 'map-start', 'location-save', 'continue', 'error']) {
        assert.ok(modal.includes(`data-trial-${selector}`), selector);
    }
    assert.match(modal, /<h2 id="photo-trial-title">나만의 지도 만들기<\/h2>/);
    assert.match(modal, /data-trial-count>0\/3</);
    assert.match(modal, /data-trial-continue-label>내 보관함에 저장하기</);
    assert.doesNotMatch(modal, /가입 전에 가볍게|사진 최대 3장으로|저장하고 싶을 때|내 기기의 사진을|마음에 들면|가입 후 내 보관함|브라우저에만 임시 보관|사진 속 위치 정보도 확인|체험 사진 비우기|photo-trial-privacy/);
    assert.doesNotMatch(modal, /data-route="upload"/);
    assert.match(app, /photo-trial:close/);
});

test('photo picker and save controls align their icon and label together', () => {
    assert.match(css, /\.photo-trial-picker \[data-trial-add\],\s*\.photo-trial-footer \[data-trial-continue\]\s*\{[^}]*display: inline-flex;[^}]*align-items: center;[^}]*justify-content: center;[^}]*gap: 8px;/s);
});

test('the first trial screen keeps three steps without branding or the removed introductory sentence', () => {
    const intro = html.match(/<section class="photo-trial-intro"[\s\S]*?<\/section>/)?.[0] || '';
    assert.match(intro, /data-trial-empty/);
    assert.doesNotMatch(intro, /Ikkyee|장소 저장소/);
    assert.doesNotMatch(intro, /사진을 골라 내 지도에 놓아보세요|photo-trial-intro-copy/);
    assert.equal((intro.match(/<li(?:\s|>)/g) || []).length, 3);
    assert.deepEqual([...intro.matchAll(/class="photo-trial-step-number" aria-hidden="true">(\d{2})<\/span>/g)].map(match => match[1]), ['01', '02', '03']);
    for (const icon of ['add_photo_alternate', 'add_location_alt', 'photo_library']) assert.ok(intro.includes(icon), icon);
    for (const title of ['사진 고르기', '장소 확인', '지도에 저장']) assert.ok(intro.includes(`<strong>${title}</strong>`), title);
    for (const detail of ['최대 3장까지 선택', '사진 속 장소 확인', '내 지도에 비공개 저장']) assert.ok(intro.includes(`<span class="photo-trial-step-detail">${detail}</span>`), detail);
    assert.match(intro, /class="photo-trial-step-status">현재 단계<\/span>/);
    assert.match(intro, /aria-current="step"/);
    assert.match(css, /\.photo-trial-steps\s*\{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/s);
    assert.match(css, /\.photo-trial-intro\s*\{[^}]*background:/s);
    assert.match(css, /\.photo-trial-steps::before\s*\{/s);
    assert.match(css, /@media \(max-width: 860px\)[\s\S]*\.photo-trial-steps\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
    assert.match(css, /\.photo-trial-card:has\(\[data-trial-workspace\]\[hidden\]\)\s*\{[^}]*width: min\(var\(--photo-trial-empty-width\), 100%\)/s);
});

test('the compact empty dialog omits duplicate branding without changing the selected editor', () => {
    const modal = html.slice(html.indexOf('id="photo-trial-modal"'), html.indexOf('id="auth-modal"'));
    assert.doesNotMatch(modal, /photo-trial-map-mark|images\/logo\.png|Ikkyee|장소 저장소|사진을 골라 내 지도에 놓아보세요/);
    assert.match(css, /\.photo-trial-card:has\(\[data-trial-workspace\]\[hidden\]\) \.photo-trial-picker\s*\{[^}]*justify-content: center;/s);
    assert.match(css, /\.photo-trial-card:has\(\[data-trial-workspace\]\[hidden\]\) \.photo-trial-footer\s*\{[^}]*padding:/s);
});

test('step numbering preserves native order and adapts to the compact row layout', () => {
    assert.match(html, /<ol class="photo-trial-steps" role="list">/);
    assert.match(css, /\.photo-trial-step-number\s*\{[^}]*font-variant-numeric: tabular-nums;/s);
    assert.match(css, /\.photo-trial-steps li\s*\{[^}]*grid-template-areas: "number status icon" "label label label" "detail detail detail";/s);
    assert.match(css, /\.photo-trial-steps li\[aria-current="step"\]\s*\{[^}]*border-color: transparent/s);
    assert.match(css, /@media \(max-width: 860px\)[\s\S]*\.photo-trial-steps li\s*\{[^}]*grid-template-areas: "number icon label status" "detail detail detail detail";/);
});

test('both trial stages keep the original footer frame while only its helper copy is removed', () => {
    const modal = html.slice(html.indexOf('id="photo-trial-modal"'), html.indexOf('id="auth-modal"'));
    const footer = modal.match(/<footer class="photo-trial-footer">([\s\S]*?)<\/footer>/)?.[1] || '';
    assert.match(footer, /data-trial-continue/);
    assert.match(footer, /내 보관함에 저장하기/);
    assert.doesNotMatch(footer, /사진 속 위치 정보도 확인하고 저장해 주세요/);
    assert.doesNotMatch(css, /\.photo-trial-footer:has\([^}]+display: none/s);
    assert.match(css, /\.photo-trial-footer\s*\{[^}]*min-height:[^;]+;[^}]*border-top: 1px solid var\(--line\);[^}]*background: var\(--bg\);/s);
    assert.match(css, /\.photo-trial-footer \[data-trial-continue\]\[hidden\]\s*\{\s*display: none;/);
    assert.doesNotMatch(modal, /data-trial-clear/);
    for (const action of ['data-trial-add', 'data-trial-map-start', 'data-trial-location-save', 'data-trial-location-clear']) assert.ok(modal.includes(action), action);
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
