import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const app = readFileSync('js/app.js', 'utf8');
const start = app.indexOf('function renderAlbumPhotoPickerPage()');
const rest = app.slice(start);
const renderSource = rest.slice(0, rest.indexOf('\n}') + 2);

function renderPicker(photos, selected = []) {
    const root = {};
    const render = runInNewContext(`${renderSource}; renderAlbumPhotoPickerPage`, {
        $: () => root,
        state: { albumPhotoPickerIds: selected },
        getMySavedPhotos: () => photos,
        escapeHtml: value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
        getPhotoFallbackLabel: photo => photo.title || '사진',
        renderPhotoImage: photo => `<img src="${photo.id}.jpg" alt="사진">`
    });
    render();
    return root.innerHTML;
}

test('album picker thumbnails have no visible captions but retain accessible names', () => {
    const html = renderPicker([{ id: 'one' }, { id: 'two', title: '바다 "여행"' }]);
    const cards = [...html.matchAll(/<button class="album-photo-picker-card[^>]*>([\s\S]*?)<\/button>/g)];
    assert.equal(cards.length, 2);
    for (const [, content] of cards) assert.match(content.trim(), /^<img[^>]*>$/);
    assert.match(html, /aria-label="사진"/);
    assert.match(html, /aria-label="바다 &quot;여행&quot;"/);
});

test('caption removal preserves album picker selection state and confirmation count', () => {
    const html = renderPicker([{ id: 'one' }, { id: 'two' }], ['two']);
    assert.match(html, /data-toggle-album-photo="one"[^>]*aria-pressed="false"/);
    assert.match(html, /class="album-photo-picker-card is-selected"[^>]*data-toggle-album-photo="two"[^>]*aria-pressed="true"/);
    assert.match(html, />1장 담기<\/button>/);
});

test('empty album picker retains the upload action', () => {
    const html = renderPicker([]);
    assert.match(html, /id="btn-picker-upload-photos"/);
    assert.match(html, /<small>사진 올리기<\/small>/);
    assert.doesNotMatch(html, /class="album-photo-picker-card/);
});
