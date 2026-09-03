import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('photo info editor identifies the selected photo without restoring a picker', () => {
    assert.equal(html.includes('class="location-photo-picker"'), false);
    assert.equal(html.includes('id="location-photo-list"'), false);
    assert.match(html, /data-location-editor-image/);
    assert.match(html, /id="location-editor-photo-title"/);
    assert.match(html, /id="location-editor-location-status"/);
});

test('photo info editor imports and uses the complete-location guard', () => {
    assert.match(app, /getLocationEditorCoordinateUpdate,\s*hasCompleteLocation,/s);
    assert.match(app, /const hasSavedLocation = hasCompleteLocation\(photo\)/);
});

test('photo info editor uses compact photo-detail style visibility chips', () => {
    const editorStart = html.indexOf('id="location-editor-modal"');
    const editorEnd = html.indexOf('id="auth-modal"', editorStart);
    const editorMarkup = html.slice(editorStart, editorEnd);

    assert.doesNotMatch(editorMarkup, /Photo Edit/);
    assert.doesNotMatch(editorMarkup, /사진 설명, 촬영 날짜와 지도에 표시될 위치를 수정합니다\./);
    assert.match(editorMarkup, /data-photo-visibility="private"[^>]*>\s*<span class="material-symbols-outlined">lock<\/span>\s*비공개\s*<\/button>/s);
    assert.match(editorMarkup, /data-photo-visibility="public"[^>]*>\s*<span class="material-symbols-outlined">public<\/span>\s*공개\s*<\/button>/s);
    assert.match(styles, /\.photo-visibility-editor button\s*\{[^}]*display:\s*inline-flex;[^}]*border-radius:\s*8px;[^}]*background:\s*var\(--bg\);/s);
    assert.match(styles, /\.photo-visibility-editor button \.material-symbols-outlined\s*\{[^}]*color:\s*var\(--teal-dark\);/s);
    assert.match(styles, /\.photo-visibility-editor button\.active\s*\{[^}]*background:\s*var\(--teal-dark\);[^}]*color:\s*#ffffff;/s);
});

test('photo info editor no longer exposes a photo title field', () => {
    assert.equal(html.includes('id="photo-title-input"'), false);
    assert.equal(html.includes('for="photo-title-input"'), false);
    assert.equal(html.includes('사진 이름'), false);
});

test('photo info editor coordinate inputs avoid browser number validation bubbles', () => {
    assert.match(html, /id="location-lat-input" type="text" inputmode="decimal"[^>]+readonly/);
    assert.match(html, /id="location-lng-input" type="text" inputmode="decimal"[^>]+readonly/);
    assert.equal(html.includes('id="location-lat-input" type="number"'), false);
    assert.equal(html.includes('id="location-lng-input" type="number"'), false);
    assert.equal(html.includes('id="location-lat-input" type="text" inputmode="decimal" required'), false);
});

test('photo info editor uses a real map container instead of an iframe embed', () => {
    assert.match(html, /<div id="location-editor-map-canvas" class="location-editor-map-canvas"/);
    assert.match(html, /id="btn-pick-photo-location"[^>]*>지도에서 위치수정<\/button>/);
    assert.equal(html.includes('id="location-editor-map-frame"'), false);
});

test('photo info editor stays inside the viewport and scrolls without moving the page behind it', () => {
    assert.match(styles, /body\.modal-open\s*\{[^}]*overflow:\s*hidden;/s);
    assert.match(styles, /#location-editor-modal \.modal-card\s*\{[^}]*max-height:\s*calc\(100dvh - 48px\);[^}]*overflow-y:\s*auto;[^}]*overscroll-behavior:\s*contain;/s);
    assert.match(app, /function syncModalScrollLock\(\)/);
    assert.match(app, /document\.body\.classList\.toggle\('modal-open'/);
    assert.match(app, /modal\.classList\.add\('is-open'\);[\s\S]*syncModalScrollLock\(\)/);
    assert.match(app, /modal\.classList\.remove\('is-open'\);[\s\S]*syncModalScrollLock\(\)/);
});

test('map editing expands to a large picker with an in-map save action', () => {
    assert.match(html, /class="map-location-save-button btn-primary"[^>]*form="location-editor-form"[^>]*>이 위치로 저장<\/button>/);
    assert.match(styles, /#location-editor-modal\.is-map-picking \.modal-card\s*\{[^}]*width:\s*min\(1120px,[^}]*height:\s*calc\(100dvh - 32px\);/s);
    assert.match(styles, /#location-editor-modal\.is-map-picking \.location-editor-map\s*\{[^}]*height:\s*100%;/s);
});

test('location precision controls expose only exact and approximate choices', () => {
    const editorStart = html.indexOf('id="location-editor-modal"');
    const editorEnd = html.indexOf('id="auth-modal"', editorStart);
    const editorMarkup = html.slice(editorStart, editorEnd);

    assert.match(editorMarkup, /data-photo-location-precision="exact"/);
    assert.match(editorMarkup, /data-photo-location-precision="approximate"/);
    assert.doesNotMatch(editorMarkup, /data-photo-location-precision="hidden"/);
    assert.match(app, /button\.disabled = !hasLocation/);
});
