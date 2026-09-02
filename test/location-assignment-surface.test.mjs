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
    assert.match(surface, /id="btn-skip-location-assignment"/);
    assert.match(surface, /id="btn-skip-location-assignment"[^>]+data-toast="위치 없이 보관했어요"/);
    assert.match(surface, /id="btn-save-location-assignment"[^>]+data-toast="위치를 저장했어요"/);
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
    const queueRenderer = app.slice(app.indexOf('thumbnails.innerHTML'), app.indexOf("if (image)", app.indexOf('thumbnails.innerHTML')));
    assert.doesNotMatch(queueRenderer, /formatLocationAssignmentDate/);
    assert.doesNotMatch(styles, /\.location-assignment-thumbnails span/);
    assert.doesNotMatch(app, /Number\(photo\.lat\)\.toFixed\(4\), \$\{Number\(photo\.lng\)\.toFixed\(4\)\}/);
    assert.match(app, /locationAssignmentReferenceMarkers/);
    assert.match(app, /location-assignment-reference-marker/);
    assert.match(app, /formatLocationAssignmentRelativeTime\(photo\)/);
});

test('photos can leave the queue without a location and return when one is saved later', () => {
    assert.match(app, /skip \? \{ location_assignment_skipped: true \}/);
    assert.match(app, /async function saveLocationAssignment\(event\)[\s\S]*location_assignment_skipped: false/);
    assert.match(app, /async function saveManualLocation\(event\)[\s\S]*location_assignment_skipped: false/);
});

test('location assignment confirms either save action with a short bottom-center notice', () => {
    assert.match(app, /showToast\(button\.dataset\.toast\)/);
    assert.match(styles, /\.toast\s*\{[^}]*left:\s*50%;[^}]*bottom:/s);
    assert.match(styles, /\.toast\.is-visible\s*\{[^}]*animation:\s*toast-visibility 1800ms/s);
    assert.match(styles, /@keyframes toast-visibility[\s\S]*transform:\s*translate\(-50%,\s*0\)/);
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

test('switching to a photo without nearby references preserves the current map viewport', () => {
    const start = app.indexOf('async function ensureLocationAssignmentMap()');
    const end = app.indexOf('function renderLocationAssignmentPage()', start);
    const mapSetup = app.slice(start, end);

    assert.match(mapSetup, /new maps\.Map\(container, getLocationEditorMapOptions\(defaultCenter,/);
    assert.doesNotMatch(mapSetup, /if \(!nearbyPhotos\.length\)\s*\{[^}]*setCenter\(defaultCenter\)[^}]*setZoom\(7\)/s);
});

test('location assignment offers an on-demand stationary Street View reference', () => {
    const start = html.indexOf('id="page-location-assign"');
    const end = html.indexOf('id="page-album"', start);
    const surface = html.slice(start, end);

    assert.match(surface, /id="btn-open-location-assignment-street-view"[^>]*disabled/);
    assert.match(surface, /id="location-assignment-street-view"[^>]*hidden/);
    assert.match(surface, /id="location-assignment-street-view-canvas"/);
    assert.match(surface, /id="location-assignment-street-view-message"[^>]*aria-live="polite"/);
    assert.match(surface, /id="btn-close-location-assignment-street-view"/);
    assert.match(app, /LOCATION_ASSIGNMENT_STREET_VIEW_RADII/);
    assert.match(app, /new maps\.StreetViewService\(\)/);
    assert.match(app, /new maps\.StreetViewPanorama\(canvas,\s*\{[^}]*clickToGo:\s*false[^}]*linksControl:\s*false/s);
    assert.match(app, /btn-open-location-assignment-street-view[^\n]+loadLocationAssignmentStreetView/);
    assert.match(app, /btn-close-location-assignment-street-view[^\n]+closeLocationAssignmentStreetView/);
    const loaderStart = app.indexOf('async function loadLocationAssignmentStreetView()');
    const loaderEnd = app.indexOf('function updateLocationAssignmentDraftReadout(', loaderStart);
    const loader = app.slice(loaderStart, loaderEnd);
    assert.doesNotMatch(loader, /locationAssignmentMarker\?*\.?setPosition/);
    assert.doesNotMatch(loader, /locationAssignmentMap\.(?:panTo|setCenter|setZoom)/);
    assert.match(styles, /\.location-assignment-street-view\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;/s);
    assert.match(styles, /@media \(max-width:\s*720px\)[\s\S]*\.location-assignment-map-stage,\s*\.location-assignment-map,\s*\.location-assignment-street-view-canvas\s*\{[^}]*min-height:\s*420px;/s);
});
