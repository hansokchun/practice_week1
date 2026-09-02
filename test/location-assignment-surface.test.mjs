import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

test('upload completion page links missing photos to the dedicated location workflow', () => {
    assert.match(html, /id="page-upload-complete"/);
    assert.match(html, /id="btn-complete-location-assign"/);
    assert.match(app, /function renderUploadCompletePage\(\)/);
    assert.match(app, /routeTo\('location-assign'\)/);
});

test('manual location page exposes queue, selected photo, search map, and save action', () => {
    const start = html.indexOf('id="page-location-assign"');
    const end = html.indexOf('id="page-album"', start);
    const surface = html.slice(start, end);

    assert.match(surface, /id="location-assignment-thumbnails"/);
    assert.match(surface, /id="location-assignment-image"/);
    assert.match(surface, /id="location-assignment-search-input"/);
    assert.match(surface, /id="location-assignment-map"/);
    assert.match(surface, /id="btn-save-location-assignment"/);
    assert.match(surface, /id="location-assignment-nearby-list"/);
    assert.doesNotMatch(surface, /Location|Selected Photo|Nearby in time/);
    assert.doesNotMatch(surface, /사진을 선택하고 검색하거나 지도를 눌러 촬영 위치를 저장하세요/);
});

test('missing-location banner routes to the dedicated page instead of the photo edit modal', () => {
    assert.match(html, /id="btn-direct-missing-location"[^>]+data-route="location-assign"/);
    assert.match(app, /data-location-assignment-photo/);
});

test('location assignment uses a responsive split workspace and mobile horizontal queues', () => {
    assert.match(styles, /\.location-assignment-editor\s*\{[^}]*grid-template-columns:/s);
    assert.match(styles, /\.location-assignment-thumbnails\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);/s);
    assert.doesNotMatch(styles, /\.location-assignment-thumbnails button\s*\{[^}]*content-visibility:\s*auto;/s);
    assert.match(styles, /@media \(max-width: 720px\)[\s\S]*\.location-assignment-thumbnails\s*\{[^}]*display:\s*flex;[^}]*overflow-x:\s*auto;/s);
});

test('location assignment loads queue thumbnails lazily and keeps nearby coordinates off the cards', () => {
    assert.match(app, /renderPhotoImage\(photo, '위치 확인이 필요한 사진', \{ fetchPriority: 'low' \}\)/);
    assert.doesNotMatch(app, /Number\(photo\.lat\)\.toFixed\(4\), \$\{Number\(photo\.lng\)\.toFixed\(4\)\}/);
    assert.match(app, /locationAssignmentReferenceMarkers/);
    assert.match(app, /location-assignment-reference-marker/);
    assert.match(app, /formatLocationAssignmentRelativeTime\(photo\)/);
});

test('my photos page does not show a redundant total photo count', () => {
    const start = html.indexOf('id="page-photos"');
    const end = html.indexOf('id="page-location-assign"', start);
    const surface = html.slice(start, end);

    assert.doesNotMatch(surface, /id="personal-photo-summary"/);
    assert.doesNotMatch(app, /#personal-photo-summary/);
});

test('dragging the assignment pin updates its coordinate readout continuously', () => {
    assert.match(app, /locationAssignmentMarker\.addListener\('drag',/);
    assert.match(app, /updateLocationAssignmentDraftReadout/);
});
