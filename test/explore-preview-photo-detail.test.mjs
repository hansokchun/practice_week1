import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const source = readFileSync('js/app.js', 'utf8');

test('Explore pin preview image expands the inline preview instead of opening the photo detail modal', () => {
    const previewStart = html.indexOf('id="explore-pin-preview"');
    const previewEnd = html.indexOf('class="pin-preview-copy"', previewStart);
    const preview = html.slice(previewStart, previewEnd);
    const clickStart = source.indexOf("const explorePreviewPhoto = event.target.closest('[data-pin-preview-photo]')");
    const clickEnd = source.indexOf('collapseExplorePreviewIfOutside(event.target);', clickStart) + 'collapseExplorePreviewIfOutside(event.target);'.length;
    const clickBody = source.slice(clickStart, clickEnd);

    assert.match(preview, /data-pin-preview-photo/);
    assert.doesNotMatch(preview, /data-open-photo-detail/);
    assert.match(clickBody, /setExplorePreviewExpanded\(true\)/);
    assert.doesNotMatch(clickBody, /openModal\('#photo-detail-modal'\)/);
});

test('Explore pin preview stores the selected photo id on the preview image action', () => {
    const fnStart = source.indexOf('function updateExplorePhotoPreview');
    const fnEnd = source.indexOf('function updateExploreAlbumPreview', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /const photoButton = preview\.querySelector\('\[data-pin-preview-photo\]'\)/);
    assert.match(body, /photoButton\.dataset\.photoId = photo\.id \|\| ''/);
});

test('Explore expanded preview can collapse when the user clicks outside the preview card', () => {
    assert.match(source, /function setExplorePreviewExpanded\(isExpanded\)/);
    assert.match(source, /function collapseExplorePreviewIfOutside\(target\)/);
    assert.match(source, /collapseExplorePreviewIfOutside\(event\.target\)/);
});
