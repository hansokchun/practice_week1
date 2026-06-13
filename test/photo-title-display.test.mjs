import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const source = readFileSync('js/app.js', 'utf8');

test('individual photos do not persist a title field', () => {
    const uploadStart = source.indexOf('async function persistStagedPhotos');
    const uploadEnd = source.indexOf('async function saveAlbumDraft', uploadStart);
    const uploadBody = source.slice(uploadStart, uploadEnd);
    const normalizeStart = source.indexOf('function normalizeSavedPhoto');
    const normalizeEnd = source.indexOf('function normalizeSavedAlbum', normalizeStart);
    const normalizeBody = source.slice(normalizeStart, normalizeEnd);

    assert.doesNotMatch(uploadBody, /title:/);
    assert.doesNotMatch(normalizeBody, /title/);
    assert.doesNotMatch(normalizeBody, /name:/);
});

test('photo edits save description without sending a title update', () => {
    const saveStart = source.indexOf('async function saveManualLocation');
    const saveEnd = source.indexOf('async function searchExploreMap', saveStart);
    const body = source.slice(saveStart, saveEnd);

    assert.match(body, /description,/);
    assert.doesNotMatch(body, /title,/);
    assert.doesNotMatch(body, /photo-title-input/);
});

test('Explore pin preview opens author profile from avatar or name only', () => {
    const previewStart = html.indexOf('id="explore-pin-preview"');
    const previewEnd = html.indexOf('id="explore-list"', previewStart);
    const preview = html.slice(previewStart, previewEnd);

    assert.match(preview, /class="pin-author-link" data-go-profile/);
    assert.doesNotMatch(preview, /data-go-trip/);
    assert.doesNotMatch(preview, /<small>/);
});

test('Explore pin preview no longer shows the selected pin label', () => {
    const previewStart = html.indexOf('id="explore-pin-preview"');
    const previewEnd = html.indexOf('id="explore-list"', previewStart);
    const preview = html.slice(previewStart, previewEnd);

    assert.doesNotMatch(preview, /Selected Pin/i);
    assert.doesNotMatch(preview, /class="eyebrow"/);
});

test('photo detail and Explore preview do not render individual photo title fields', () => {
    const previewStart = html.indexOf('id="explore-pin-preview"');
    const previewEnd = html.indexOf('id="explore-list"', previewStart);
    const preview = html.slice(previewStart, previewEnd);
    const exploreStart = source.indexOf('function updateExplorePhotoPreview');
    const exploreEnd = source.indexOf('function setExplorePreviewExpanded', exploreStart);
    const exploreBody = source.slice(exploreStart, exploreEnd);

    assert.doesNotMatch(source, /function getPhotoTitle\(photo\)/);
    assert.doesNotMatch(preview, /<h2>/);
    assert.doesNotMatch(exploreBody, /title\.hidden = !displayTitle/);
    assert.match(source, /updatePhotoDetailModal\(photo\)/);
});
