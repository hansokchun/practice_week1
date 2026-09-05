import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    canShowPhotoOnPublicMap,
    canShowPhotoInExploreScope,
    getDefaultLocationPrecision,
    getEditableLocationPrecision,
    getPhotoLocationDisplayLabel,
    getLocationPrecisionLabel,
    normalizeLocationPrecision
} from '../js/photo-location-privacy.mjs';

const appSource = readFileSync('js/app.js', 'utf8');
const appMarkup = readFileSync('index.html', 'utf8');
const policyDocument = readFileSync(
    'docs/product/public-photo-privacy-policy.md',
    'utf8'
);
const accuracyMigration = readFileSync(
    'supabase/migrations/20260904123000_reinterpret_location_precision_as_accuracy.sql',
    'utf8'
);
const launchChecklist = readFileSync(
    'docs/product/public-beta-launch-checklist-2026-07-22.md',
    'utf8'
);

test('location accuracy defaults unknown and legacy values to approximate', () => {
    assert.equal(normalizeLocationPrecision(), 'approximate');
    assert.equal(normalizeLocationPrecision('approximate'), 'approximate');
    assert.equal(normalizeLocationPrecision('unexpected'), 'approximate');
    assert.equal(normalizeLocationPrecision('hidden'), 'approximate');
});

test('captured GPS defaults to exact while a manually selected point defaults to approximate', () => {
    assert.equal(getDefaultLocationPrecision('exif'), 'exact');
    assert.equal(getDefaultLocationPrecision('gpx'), 'exact');
    assert.equal(getDefaultLocationPrecision('manual'), 'approximate');
    assert.equal(getDefaultLocationPrecision(), 'approximate');
});

test('public map pins depend on coordinates rather than the accuracy label', () => {
    assert.equal(canShowPhotoOnPublicMap({ lat: 37.5665, lng: 126.978, location_precision: 'hidden' }), true);
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

test('Explore others scope keeps visibility rules without changing coordinates', () => {
    const options = { scope: 'others', currentUserId: 'owner-1' };

    assert.equal(canShowPhotoInExploreScope({ owner_id: 'owner-2', lat: 37.5, lng: 127, visibility: 'public', location_precision: 'exact' }, options), true);
    assert.equal(canShowPhotoInExploreScope({ owner_id: 'owner-2', lat: 37.5, lng: 127, visibility: 'private', location_precision: 'exact' }, options), false);
    assert.equal(canShowPhotoInExploreScope({ owner_id: 'owner-2', lat: 37.5, lng: 127, visibility: 'public', location_precision: 'hidden' }, options), true);
    assert.equal(canShowPhotoInExploreScope({ owner_id: 'owner-1', lat: 37.5, lng: 127, visibility: 'public', location_precision: 'exact' }, options), false);
});

test('location accuracy labels describe user confidence in the saved point', () => {
    assert.equal(getLocationPrecisionLabel('exact'), '정확한 위치');
    assert.equal(getLocationPrecisionLabel('approximate'), '대략 위치');
    assert.equal(getLocationPrecisionLabel('hidden'), '대략 위치');
});

test('photo detail hides coordinates only for approximate locations', () => {
    assert.equal(getPhotoLocationDisplayLabel({ lat: 37.5665, lng: 126.978, location_precision: 'exact' }), '37.5665, 126.9780');
    assert.equal(getPhotoLocationDisplayLabel({ lat: 37.5665, lng: 126.978, location_precision: 'approximate' }), '대략적인 위치');
    assert.equal(getPhotoLocationDisplayLabel({ lat: 37.5665, lng: 126.978, location_precision: 'hidden' }), '대략적인 위치');
    assert.equal(getPhotoLocationDisplayLabel({ lat: null, lng: null, location_precision: 'exact' }), '위치 정보 없음');
});

test('Explore filters missing coordinates and the editor persists the selected precision', () => {
    assert.match(appSource, /canShowPhotoOnPublicMap\(photo\)/);
    assert.match(appSource, /location_precision: state\.editingPhotoLocationPrecision/);
});

test('photo settings separate visibility from the two location accuracy choices', () => {
    const locationEditor = appMarkup.slice(
        appMarkup.indexOf('id="location-editor-modal"'),
        appMarkup.indexOf('id="auth-modal"')
    );
    assert.match(locationEditor, /data-photo-visibility="private"/);
    assert.match(locationEditor, /data-photo-visibility="public"/);
    assert.match(locationEditor, /data-photo-location-precision="exact"/);
    assert.match(locationEditor, /data-photo-location-precision="approximate"/);
    assert.doesNotMatch(locationEditor, /data-photo-location-precision="hidden"/);
    assert.match(locationEditor, />위치 정확도</);
    assert.match(locationEditor, /지정한 지점이 맞다고 확신하면/);
    assert.match(appSource, /editingPhotoLocationPrecision:\s*'approximate'/);
    assert.match(appSource, /getEditableLocationPrecision\(photo\?\.location_precision\)/);
    assert.equal(getEditableLocationPrecision('exact'), 'exact');
    assert.equal(getEditableLocationPrecision('approximate'), 'approximate');
    assert.equal(getEditableLocationPrecision('hidden'), 'approximate');
});

test('manual location assignment lets the author choose accuracy without changing the pin', () => {
    const assignmentPage = appMarkup.slice(
        appMarkup.indexOf('id="page-location-assign"'),
        appMarkup.indexOf('id="location-editor-modal"')
    );
    assert.match(assignmentPage, /data-location-assignment-precision="exact"/);
    assert.match(assignmentPage, /data-location-assignment-precision="approximate"/);
    assert.match(assignmentPage, /두 경우 모두 선택한 핀 위치가 그대로 저장됩니다/);
    assert.match(appSource, /location_precision: state\.locationAssignmentPrecision/);
});

test('publication help explains saved point disclosure and immediate revocation behavior', () => {
    assert.match(appMarkup, /id="photo-visibility-help"[^>]*role="tooltip"/);
    assert.match(appMarkup, /사진, 설명, 촬영일과 저장한 위치/);
    assert.match(appMarkup, /지도와 공개 프로필에서 즉시 사라집니다/);
    assert.match(policyDocument, /`exact`/);
    assert.match(policyDocument, /`approximate`/);
    assert.match(policyDocument, /좌표를 반올림하거나 이동시키지 않는다/);
    assert.match(policyDocument, /촬영 시각의 시·분·초는 공개 화면에 표시하지 않는다/);
    assert.match(policyDocument, /Explore와 공개 프로필에서 즉시 제외/);
});

test('database migration restores source coordinates and stops rounding approximate points', () => {
    assert.match(accuracyMigration, /set lat = source\.lat,\s*lng = source\.lng/s);
    assert.doesNotMatch(accuracyMigration, /round\s*\(/i);
    assert.match(accuracyMigration, /set default 'approximate'/);
    assert.match(accuracyMigration, /check \(location_precision in \('exact', 'approximate'\)\)/);
    assert.match(launchChecklist, /위치 정확도/);
});
