import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { getExplorePreviewExpansionAction } from '../js/explore-preview-expansion.mjs';

const html = readFileSync('index.html', 'utf8');
const source = readFileSync('js/app.js', 'utf8');
const css = readFileSync('style.css', 'utf8');

test('Explore pin preview image expands the inline preview instead of opening the photo detail modal', () => {
    const previewStart = html.indexOf('id="explore-pin-preview"');
    const previewEnd = html.indexOf('class="pin-preview-story"', previewStart);
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

test('Explore expanded pin preview image opens the photo detail modal', () => {
    const clickStart = source.indexOf("const explorePreviewPhoto = event.target.closest('[data-pin-preview-photo]');");
    const clickEnd = source.indexOf("const previewAction = getExplorePreviewExpansionAction({", clickStart);
    const clickBody = source.slice(clickStart, clickEnd);

    assert.match(clickBody, /preview\?\.classList\.contains\('is-expanded'\)/);
    assert.match(clickBody, /updatePhotoDetailModal\(photo, \{ context: 'explore' \}\)/);
    assert.match(clickBody, /openModal\('#photo-detail-modal'\)/);
});

test('Explore pin preview stores the selected photo id on the preview image action', () => {
    const fnStart = source.indexOf('function updateExplorePhotoPreview');
    const fnEnd = source.indexOf('function updateExploreAlbumPreview', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /const photoButton = preview\.querySelector\('\[data-pin-preview-photo\]'\)/);
    assert.match(body, /photoButton\.dataset\.photoId = photo\.id \|\| ''/);
});

test('Explore photo preview image falls back when the public image URL fails', () => {
    const helperStart = source.indexOf('function getPhotoImageSrc');
    const helperEnd = source.indexOf('function showToast', helperStart);
    const helpers = source.slice(helperStart, helperEnd);
    const fnStart = source.indexOf('function updateExplorePhotoPreview');
    const fnEnd = source.indexOf('function setExplorePreviewExpanded', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(helpers, /function getPhotoImageSrc\(photo = \{\}\)/);
    assert.match(helpers, /function getPhotoImageFallbackSrc\(photo = \{\}, primarySrc = ''\)/);
    assert.match(helpers, /function setImageSourceWithFallback\(image, primarySrc, fallbackSrc = 'images\/main_bg2\.jpg'\)/);
    assert.match(helpers, /image\.onerror = \(\) => \{/);
    assert.match(body, /const photoImageSrc = getPhotoImageSrc\(photo\);/);
    assert.match(body, /setImageSourceWithFallback\(image, photoImageSrc, getPhotoImageFallbackSrc\(photo, photoImageSrc\)\)/);
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

test('Explore pin preview sits in the right discovery panel position', () => {
    assert.match(css, /\.explore-pin-preview\s*\{[^}]*top:\s*92px;[^}]*right:\s*28px;[^}]*left:\s*auto;/s);
    assert.match(css, /\.explore-pin-preview\s*\{[^}]*width:\s*min\(390px,\s*calc\(100% - 56px\)\);/s);
    assert.match(css, /\.explore-pin-preview\s*\{[^}]*height:\s*clamp\(560px,\s*calc\(100svh - 108px\),\s*900px\);/s);
    assert.match(css, /body\.explore-pin-selected #page-explore \.explore-discovery-panel\s*\{[^}]*visibility:\s*hidden;[^}]*pointer-events:\s*none;/s);
    assert.match(css, /\.explore-pin-preview\s*\{[^}]*padding:\s*18px;/s);
    assert.match(css, /\.pin-preview-photo-button img\s*\{[^}]*aspect-ratio:\s*4 \/ 3;/s);
});

test('Explore expanded photo preview keeps the large photo area visible', () => {
    assert.match(css, /\.explore-pin-preview\.is-expanded \.pin-preview-photo-button\s*\{[^}]*display:\s*block;[^}]*min-height:\s*min\(52svh,\s*460px\);/s);
    assert.match(css, /\.explore-pin-preview\.is-expanded \.pin-preview-photo-button img\s*\{[^}]*height:\s*min\(52svh,\s*460px\);[^}]*max-height:\s*min\(52svh,\s*460px\);[^}]*object-fit:\s*contain;/s);
});

test('Explore photo preview uses an icon-only close action and hides the global footer on Explore', () => {
    assert.match(css, /\.panel-close\s*\{[^}]*border:\s*0;[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/s);
    assert.match(css, /body\[data-page="explore"\]\s+\.site-footer\s*\{[^}]*display:\s*none;/s);
});

test('Explore pin preview follows an author, photo, story, and info order', () => {
    const previewStart = html.indexOf('id="explore-pin-preview"');
    const previewEnd = html.indexOf('id="explore-list"', previewStart);
    const preview = html.slice(previewStart, previewEnd);

    assert.ok(preview.indexOf('class="pin-author"') < preview.indexOf('data-pin-preview-photo'));
    assert.ok(preview.indexOf('data-pin-preview-photo') < preview.indexOf('class="pin-preview-story"'));
    assert.ok(preview.indexOf('class="pin-preview-story"') < preview.indexOf('class="pin-preview-meta"'));
    assert.match(preview, /class="pin-author-time"/);
    assert.doesNotMatch(preview, /pin-preview-copy[\s\S]*<h2/);
});

test('Explore photo preview fills story text and relative upload time', () => {
    const fnStart = source.indexOf('function updateExplorePhotoPreview');
    const fnEnd = source.indexOf('function setExplorePreviewExpanded', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /const story = preview\.querySelector\('\.pin-preview-story p'\)/);
    assert.match(body, /const authorTimeNode = preview\.querySelector\('\.pin-author-time'\)/);
    assert.match(body, /formatRelativeTime\(photo\.created_at \|\| photo\.uploaded_at \|\| photo\.createdAt \|\| photo\.date\)/);
    assert.doesNotMatch(body, /사진 기록/);
    assert.doesNotMatch(body, /title\.textContent = displayTitle/);
});

test('Explore photo preview hides the story block when no description exists', () => {
    const fnStart = source.indexOf('function updateExplorePhotoPreview');
    const fnEnd = source.indexOf('function setExplorePreviewExpanded', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /const storyWrap = preview\.querySelector\('\.pin-preview-story'\)/);
    assert.match(body, /storyWrap\.hidden = !description/);
    assert.doesNotMatch(body, /사진에 대한 글이 아직 없습니다/);
});

test('Explore photo preview does not render nearby photo thumbnails', () => {
    const previewStart = html.indexOf('id="explore-pin-preview"');
    const previewEnd = html.indexOf('id="explore-list"', previewStart);
    const preview = html.slice(previewStart, previewEnd);
    const fnStart = source.indexOf('function updateExplorePhotoPreview');
    const fnEnd = source.indexOf('function setExplorePreviewExpanded', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.doesNotMatch(preview, /data-pin-preview-nearby/);
    assert.doesNotMatch(preview, /data-pin-preview-nearby-list/);
    assert.doesNotMatch(preview, />주변사진</);
    assert.doesNotMatch(preview, />Nearby</);
    assert.doesNotMatch(body, /const nearbyPhotos = getNearbyExplorePhotos\(photo\);/);
    assert.doesNotMatch(body, /data-explore-nearby-photo="\$\{escapeHtml\(nearbyPhoto\.id\)\}"/);
    assert.doesNotMatch(css, /\.pin-preview-nearby__grid\s*\{/s);
    assert.doesNotMatch(source, /data-explore-nearby-photo/);
});

test('Explore photo preview keeps capture info as compact chips below the story', () => {
    const fnStart = source.indexOf('function updateExplorePhotoPreview');
    const fnEnd = source.indexOf('function setExplorePreviewExpanded', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /<span data-pin-meta="date"><span class="material-symbols-outlined">calendar_today<\/span> \$\{dateLabel\}<\/span>/);
    assert.match(body, /<span data-pin-meta="place"><span class="material-symbols-outlined">place<\/span> \$\{Number\(photo\.lat\)\.toFixed\(4\)\}, \$\{Number\(photo\.lng\)\.toFixed\(4\)\}<\/span>/);
    assert.doesNotMatch(body, /<b>찍은 날짜<\/b>/);
});

test('Explore expanded own-photo preview can edit only description and visibility', () => {
    const previewStart = html.indexOf('id="explore-pin-preview"');
    const previewEnd = html.indexOf('id="explore-list"', previewStart);
    const preview = html.slice(previewStart, previewEnd);
    const saveStart = source.indexOf('async function saveExplorePreviewEdits');
    const saveEnd = source.indexOf('async function getGoogleMapsApiKey', saveStart);
    const saveBody = source.slice(saveStart, saveEnd);

    assert.match(preview, /id="btn-edit-pin-preview"/);
    assert.match(preview, /id="pin-preview-description-input"/);
    assert.match(preview, /data-preview-visibility="private"/);
    assert.match(preview, /data-preview-visibility="public"/);
    assert.match(saveBody, /updatePhotoInfo\(photo\.id, \{\s*description,\s*visibility:/s);
    assert.doesNotMatch(saveBody, /lat,/);
    assert.doesNotMatch(saveBody, /lng,/);
    assert.doesNotMatch(saveBody, /date:/);
    assert.doesNotMatch(saveBody, /title,/);
});
