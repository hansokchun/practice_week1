import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { getExplorePreviewExpansionAction } from '../js/explore-preview-expansion.mjs';

const html = readFileSync('index.html', 'utf8');
const source = readFileSync('js/app.js', 'utf8');
const css = readFileSync('style.css', 'utf8');

test('Explore pin preview image expands the inline preview instead of opening the photo detail modal', () => {
    const previewStart = html.indexOf('id="explore-pin-preview"');
    const previewEnd = html.indexOf('class="pin-preview-copy"', previewStart);
    const preview = html.slice(previewStart, previewEnd);
    const clickStart = source.indexOf("const previewAction = getExplorePreviewExpansionAction({");
    const clickEnd = source.indexOf("const routeButton = event.target.closest('[data-route]');", clickStart);
    const clickBody = source.slice(clickStart, clickEnd);

    assert.match(preview, /data-pin-preview-photo/);
    assert.doesNotMatch(preview, /data-open-photo-detail/);
    assert.match(clickBody, /clickedPreviewPhoto: Boolean\(explorePreviewPhoto\)/);
    assert.match(clickBody, /previewAction === 'expand'/);
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

test('Explore photo preview only shows visibility for the current user photo', () => {
    const fnStart = source.indexOf('function updateExplorePhotoPreview');
    const fnEnd = source.indexOf('function updateExploreAlbumPreview', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /const isOwnPhoto = Boolean\(state\.currentUser\?\.id && ownerId === state\.currentUser\.id\)/);
    assert.match(body, /const visibilityMeta = isOwnPhoto/);
    assert.match(body, /data-pin-meta="visibility"/);
    assert.match(body, /\$\{visibilityMeta\}/);
});

test('Explore expanded preview can collapse when the user clicks outside the preview card', () => {
    assert.match(source, /function setExplorePreviewExpanded\(isExpanded\)/);
    assert.match(source, /getExplorePreviewExpansionAction\(/);
    assert.match(source, /previewAction === 'collapse'/);
});

test('Explore preview expansion action is decided outside app DOM wiring', () => {
    assert.equal(getExplorePreviewExpansionAction({ clickedPreviewPhoto: true }), 'expand');
    assert.equal(getExplorePreviewExpansionAction({ isExpanded: true, clickedInsidePreview: false }), 'collapse');
    assert.equal(getExplorePreviewExpansionAction({ isExpanded: true, clickedInsidePreview: true }), 'none');
    assert.equal(getExplorePreviewExpansionAction({ isExpanded: false, clickedInsidePreview: false }), 'none');
});

test('Explore pin preview uses a small entrance grow animation', () => {
    assert.match(css, /\.explore-pin-preview\s*\{[^}]*animation:\s*pinPreviewEnter/s);
    assert.match(css, /\.pin-preview-photo-button\s*\{[^}]*animation:\s*pinPreviewPhotoEnter/s);
    assert.match(css, /@keyframes pinPreviewEnter\s*\{[\s\S]*transform:\s*translateY\(8px\)\s+scale\(0\.96\)/);
    assert.match(css, /@keyframes pinPreviewPhotoEnter\s*\{[\s\S]*transform:\s*scale\(0\.975\)/);
});
