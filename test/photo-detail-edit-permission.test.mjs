import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('js/app.js', 'utf8');

test('photo detail edit button is shown only for the photo owner', () => {
    const fnStart = source.indexOf('function updatePhotoDetailModal');
    const fnEnd = source.indexOf('function updateAccountUI', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /const editButton = modal\?\.querySelector\('\[data-open-photo-editor\]'\)/);
    assert.match(body, /const canEdit = Boolean\(state\.currentUser\?\.id && photo\.owner_id === state\.currentUser\.id\)/);
    assert.match(body, /editButton\.hidden = !canEdit/);
});

test('photo editor click path refuses non-owner photos', () => {
    const locationButtonIndex = source.indexOf("const locationButton = event.target.closest('[data-open-photo-editor]')");
    const body = source.slice(locationButtonIndex, locationButtonIndex + 700);

    assert.match(body, /const photoId = locationButton\.dataset\.photoId \|\| state\.selectedPhotoId/);
    assert.match(body, /getLocationEditorPhoto\(getMySavedPhotos\(\), photoId\)/);
    assert.match(body, /editablePhoto\.owner_id !== state\.currentUser\.id/);
    assert.match(body, /본인 사진만 수정할 수 있습니다/);
});
