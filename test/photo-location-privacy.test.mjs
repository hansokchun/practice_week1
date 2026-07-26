import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    canShowPhotoOnPublicMap,
    getLocationPrecisionLabel,
    normalizeLocationPrecision
} from '../js/photo-location-privacy.mjs';

const appSource = readFileSync('js/app.js', 'utf8');
const locationQaRecord = readFileSync(
    'docs/qa/public-location-privacy-role-qa-2026-07-26.md',
    'utf8'
);
const launchChecklist = readFileSync(
    'docs/product/public-beta-launch-checklist-2026-07-22.md',
    'utf8'
);

test('location precision defaults to hidden until an owner chooses a public precision', () => {
    assert.equal(normalizeLocationPrecision(), 'hidden');
    assert.equal(normalizeLocationPrecision('approximate'), 'approximate');
    assert.equal(normalizeLocationPrecision('unexpected'), 'hidden');
});

test('hidden photo locations never produce public map pins', () => {
    assert.equal(canShowPhotoOnPublicMap({ lat: 37.5665, lng: 126.978, location_precision: 'hidden' }), false);
    assert.equal(canShowPhotoOnPublicMap({ lat: 37.5665, lng: 126.978, location_precision: 'approximate' }), true);
});

test('location precision labels describe the selected public boundary', () => {
    assert.equal(getLocationPrecisionLabel('exact'), '정확한 위치');
    assert.equal(getLocationPrecisionLabel('approximate'), '대략 위치');
    assert.equal(getLocationPrecisionLabel('hidden'), '위치 숨김');
});

test('Explore filters hidden locations and the editor persists the selected precision', () => {
    assert.match(appSource, /canShowPhotoOnPublicMap\(photo\)/);
    assert.match(appSource, /location_precision: state\.editingPhotoLocationPrecision/);
});

test('location privacy QA records owner, non-owner, and anonymous role evidence', () => {
    assert.match(locationQaRecord, /0 private photos, hidden locations, hidden coordinates/i);
    assert.match(locationQaRecord, /0 target private photos/i);
    assert.match(locationQaRecord, /owner could read 19 owned photos and 17 owned private source rows/i);
    assert.match(locationQaRecord, /0 approximate rows matched their private source coordinates exactly/i);
    assert.match(locationQaRecord, /fresh project cannot yet reconstruct the complete schema/i);
    assert.match(launchChecklist, /\| Public location privacy \| Passing \|/);
});
