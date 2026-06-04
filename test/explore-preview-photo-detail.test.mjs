import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const source = readFileSync('js/app.js', 'utf8');

test('Explore pin preview image opens the photo detail modal', () => {
    const previewStart = html.indexOf('id="explore-pin-preview"');
    const previewEnd = html.indexOf('class="pin-preview-copy"', previewStart);
    const preview = html.slice(previewStart, previewEnd);

    assert.match(preview, /data-pin-preview-photo/);
    assert.match(preview, /data-open-photo-detail/);
});

test('Explore pin preview stores the selected photo id on the preview image action', () => {
    const fnStart = source.indexOf('function updateExplorePhotoPreview');
    const fnEnd = source.indexOf('function updateExploreAlbumPreview', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /const photoButton = preview\.querySelector\('\[data-pin-preview-photo\]'\)/);
    assert.match(body, /photoButton\.dataset\.photoId = photo\.id \|\| ''/);
});
