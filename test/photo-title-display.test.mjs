import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const source = readFileSync('js/app.js', 'utf8');

test('uploaded photos do not persist the file name as the photo title', () => {
    assert.match(source, /title:\s*'',/);
    assert.doesNotMatch(source, /title:\s*photo\.name,/);
});

test('photo edits can save an empty title without restoring the old name', () => {
    const saveStart = source.indexOf('async function saveManualLocation');
    const saveEnd = source.indexOf('async function searchExploreMap', saveStart);
    const body = source.slice(saveStart, saveEnd);

    assert.match(body, /title,\s*\n/);
    assert.doesNotMatch(body, /title:\s*title\s*\|\|\s*photo\.name/);
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

test('photo detail and Explore preview hide title fields when no user title exists', () => {
    assert.match(source, /function getPhotoTitle\(photo\)/);
    assert.match(source, /title\.hidden = !displayTitle/);
    assert.match(source, /image\.alt = displayTitle \|\| '공개 사진'/);
    assert.match(source, /image\.alt = displayTitle \|\| '여행 사진 상세'/);
});
