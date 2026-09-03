import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    canShowPhotoOnPublicMap,
    canShowPhotoInExploreScope,
    getEditableLocationPrecision,
    getLocationPrecisionLabel,
    normalizeLocationPrecision
} from '../js/photo-location-privacy.mjs';

const appSource = readFileSync('js/app.js', 'utf8');
const appMarkup = readFileSync('index.html', 'utf8');
const policyDocument = readFileSync(
    'docs/product/public-photo-privacy-policy.md',
    'utf8'
);
const locationQaRecord = readFileSync(
    'docs/qa/public-location-privacy-role-qa-2026-07-26.md',
    'utf8'
);
const launchChecklist = readFileSync(
    'docs/product/public-beta-launch-checklist-2026-07-22.md',
    'utf8'
);

test('location precision defaults unknown values to approximate while preserving legacy privacy', () => {
    assert.equal(normalizeLocationPrecision(), 'approximate');
    assert.equal(normalizeLocationPrecision('approximate'), 'approximate');
    assert.equal(normalizeLocationPrecision('unexpected'), 'approximate');
    assert.equal(normalizeLocationPrecision('hidden'), 'hidden');
});

test('public map pins require coordinates and preserve legacy hidden privacy', () => {
    assert.equal(canShowPhotoOnPublicMap({ lat: 37.5665, lng: 126.978, location_precision: 'hidden' }), false);
    assert.equal(canShowPhotoOnPublicMap({ lat: null, lng: 126.978, location_precision: 'approximate' }), false);
    assert.equal(canShowPhotoOnPublicMap({ lat: 37.5665, lng: 126.978, location_precision: 'approximate' }), true);
});

test('Explore mine scope includes every owned located photo regardless of visibility', () => {
    const options = { scope: 'mine', currentUserId: 'owner-1' };

    assert.equal(canShowPhotoInExploreScope({ owner_id: 'owner-1', lat: 37.5, lng: 127, visibility: 'private', location_precision: 'hidden' }, options), true);
    assert.equal(canShowPhotoInExploreScope({ owner_id: 'owner-1', lat: 37.5, lng: 127, visibility: 'public', location_precision: 'exact' }, options), true);
    assert.equal(canShowPhotoInExploreScope({ owner_id: 'owner-2', lat: 37.5, lng: 127, visibility: 'public', location_precision: 'exact' }, options), false);
    assert.equal(canShowPhotoInExploreScope({ owner_id: 'owner-1', lat: null, lng: 127, visibility: 'private', location_precision: 'hidden' }, options), false);
});

test('Explore others scope keeps public location privacy rules', () => {
    const options = { scope: 'others', currentUserId: 'owner-1' };

    assert.equal(canShowPhotoInExploreScope({ owner_id: 'owner-2', lat: 37.5, lng: 127, visibility: 'public', location_precision: 'exact' }, options), true);
    assert.equal(canShowPhotoInExploreScope({ owner_id: 'owner-2', lat: 37.5, lng: 127, visibility: 'private', location_precision: 'exact' }, options), false);
    assert.equal(canShowPhotoInExploreScope({ owner_id: 'owner-2', lat: 37.5, lng: 127, visibility: 'public', location_precision: 'hidden' }, options), false);
    assert.equal(canShowPhotoInExploreScope({ owner_id: 'owner-1', lat: 37.5, lng: 127, visibility: 'public', location_precision: 'exact' }, options), false);
});

test('location precision labels describe the selected public boundary', () => {
    assert.equal(getLocationPrecisionLabel('exact'), '정확한 위치');
    assert.equal(getLocationPrecisionLabel('approximate'), '대략 위치');
    assert.equal(getLocationPrecisionLabel('hidden'), '대략 위치');
});

test('Explore filters missing coordinates and the editor persists the selected precision', () => {
    assert.match(appSource, /canShowPhotoOnPublicMap\(photo\)/);
    assert.match(appSource, /location_precision: state\.editingPhotoLocationPrecision/);
});

test('photo settings separate public visibility from the two location precision choices', () => {
    const locationEditor = appMarkup.slice(
        appMarkup.indexOf('id="location-editor-modal"'),
        appMarkup.indexOf('id="auth-modal"')
    );
    assert.match(locationEditor, /data-photo-visibility="private"/);
    assert.match(locationEditor, /data-photo-visibility="public"/);
    assert.match(locationEditor, /data-photo-location-precision="exact"/);
    assert.match(locationEditor, /data-photo-location-precision="approximate"/);
    assert.doesNotMatch(locationEditor, /data-photo-location-precision="hidden"/);
    assert.match(appSource, /editingPhotoLocationPrecision:\s*'approximate'/);
    assert.match(appSource, /getEditableLocationPrecision\(photo\.location_precision\)/);
    assert.equal(getEditableLocationPrecision('exact'), 'exact');
    assert.equal(getEditableLocationPrecision('approximate'), 'approximate');
    assert.equal(getEditableLocationPrecision('hidden'), 'approximate');
});

test('publication review explains exposed fields and immediate revocation behavior', () => {
    assert.match(appMarkup, /data-publication-review/);
    assert.match(appMarkup, /사진, 설명, 촬영일과 선택한 범위의 위치/);
    assert.match(appMarkup, /Explore와 공개 프로필에서 즉시 사라집니다/);
    assert.match(policyDocument, /`exact`/);
    assert.match(policyDocument, /`approximate`/);
    assert.match(policyDocument, /`hidden`/);
    assert.match(policyDocument, /촬영 시각의 시·분·초는 공개 화면에 표시하지 않는다/);
    assert.match(policyDocument, /Explore와 공개 프로필에서 즉시 제외/);
});

test('location privacy QA records owner, non-owner, and anonymous role evidence', () => {
    assert.match(locationQaRecord, /0 private photos, hidden locations, hidden coordinates/i);
    assert.match(locationQaRecord, /0 target private photos/i);
    assert.match(locationQaRecord, /owner could read 19 owned photos and 17 owned private source rows/i);
    assert.match(locationQaRecord, /0 approximate rows matched their private source coordinates exactly/i);
    assert.match(locationQaRecord, /full baseline is captured in `supabase\/schema\.sql`/i);
    assert.match(locationQaRecord, /2026-07-27 isolated restore rehearsal confirmed/i);
    assert.match(launchChecklist, /\| 공개 위치 개인정보 \| 통과 \|/);
});
