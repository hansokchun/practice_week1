import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

test('album detail date dividers do not show per-day photo counts', () => {
    assert.doesNotMatch(appSource, /formatPhotoCount\(section\.photoCount\)/);
});

test('album detail uses a compact map card beside the photo timeline', () => {
    assert.match(appSource, /trip-review-map-summary/);
    assert.match(appSource, /class="trip-review-map-author" data-go-profile/);
    assert.match(cssSource, /\.trip-review-map-panel\s*\{[\s\S]*border-radius: 20px/);
    assert.match(cssSource, /\.trip-review-map\s*\{[\s\S]*height: 390px/);
    assert.match(cssSource, /\.trip-review-map-author\s*\{[\s\S]*width: calc\(100% - 36px\);[\s\S]*margin: 0 18px 18px;/);
    assert.match(cssSource, /\.trip-review-map-panel\s*\{[\s\S]*margin-top: 30px/);
    assert.match(cssSource, /\.trip-review-layout\s*\{[\s\S]*gap: 36px/);
});

test('album detail uses a Google Photos style title header without a cover background', () => {
    assert.doesNotMatch(appSource, /trip-review-cover-image/);
    assert.match(cssSource, /\.trip-review-header\s*\{[\s\S]*min-height: clamp\(300px, 39vh, 420px\);[\s\S]*background: var\(--bg\);/);
    assert.doesNotMatch(cssSource, /\.trip-review-header::before/);
    assert.doesNotMatch(cssSource, /\.trip-review-header::after/);
    assert.match(cssSource, /\.trip-review-title-block h1\s*\{[\s\S]*font-size: clamp\(58px, 9\.2vw, 118px\);[\s\S]*font-weight: 800;/);
    assert.match(cssSource, /\.trip-review-meta\s*\{[\s\S]*justify-content: center;/);
    assert.match(cssSource, /\.trip-review-meta span\s*\{[\s\S]*font-size: 14px;[\s\S]*font-weight: 700;/);
    assert.match(cssSource, /\.trip-review-layout\s*\{[\s\S]*margin-top: 0;/);
});

test('album detail exposes icon actions and a three-dot album menu', () => {
    assert.match(appSource, /class="album-icon-button"[^>]*aria-label="사진 추가"[^>]*data-tooltip="사진 추가"/);
    assert.match(appSource, /class="album-icon-button"[^>]*aria-label="카카오톡으로 공유"[^>]*data-tooltip="카카오톡으로 공유"/);
    assert.doesNotMatch(appSource, /data-go-profile type="button" aria-label="작성자 프로필"/);
    assert.match(appSource, /tripReviewMapAuthor\.dataset\.publicOwnerId = selected\.owner_id \|\| ''/);
    assert.match(appSource, /class="album-more-menu"/);
    assert.match(appSource, /data-album-action="edit"/);
    assert.match(appSource, /data-album-action="cover"/);
    assert.match(appSource, /data-album-action="delete"/);
    assert.match(appSource, /const albumMenuAction = event\.target\.closest\('\[data-album-action\]'\)/);
    assert.match(cssSource, /\.album-icon-button\s*\{[\s\S]*width: 42px;[\s\S]*border-radius: 50%;/);
    assert.match(cssSource, /\.album-icon-button\[data-tooltip\]::after/);
    assert.match(cssSource, /\.album-more-menu-list\s*\{[\s\S]*position: absolute;/);
});

test('album header keeps owner actions on the right and simplifies edit mode actions', () => {
    assert.match(cssSource, /\.trip-review-header \.trip-actions\s*\{[\s\S]*grid-column: 3;[\s\S]*grid-row: 1;/);
    assert.match(cssSource, /\.trip-review-header\.is-editing \.back-link\s*\{[\s\S]*display: none;/);
    assert.match(cssSource, /\.trip-review-header\.is-editing \.trip-actions\s*\{[\s\S]*grid-column: 3;[\s\S]*justify-self: end;/);
    assert.match(appSource, /<header class="trip-review-header \$\{state\.albumDetailEditMode \? 'is-editing' : ''\}">/);
    assert.match(appSource, /id="btn-edit-album" class="album-icon-button is-active"[^>]*data-tooltip="수정 완료"/);
    assert.match(appSource, /id="btn-toggle-album-visibility" class="album-icon-button"[^>]*data-tooltip="\$\{selected\.visibility === 'public' \? '비공개로 전환' : '공개로 전환'\}"/);
    assert.match(appSource, /<span class="material-symbols-outlined">\$\{selected\.visibility === 'public' \? 'lock' : 'public'\}<\/span>/);
    assert.match(appSource, /isOwnAlbum && state\.albumDetailEditMode \? `[\s\S]*id="btn-edit-album"/);
    assert.match(appSource, /isOwnAlbum && !state\.albumDetailEditMode \? `[\s\S]*class="album-more-menu"/);
});

test('album edit fields use a lightweight Google Photos style', () => {
    assert.match(appSource, /<div class="trip-review-title-block">\s*<p class="eyebrow">Album Review Map<\/p>\s*<h1 id="trip-title">Album<\/h1>\s*<div class="trip-edit-fields">[\s\S]*<input id="trip-edit-title"/);
    assert.doesNotMatch(appSource, /trip-edit-note/);
    assert.doesNotMatch(appSource, /titleBlock\.appendChild\(form\)/);
    assert.match(cssSource, /\.trip-edit-fields\s*\{[\s\S]*grid-template-columns: 1fr;[\s\S]*justify-items: center;[\s\S]*background: transparent;/);
    assert.match(cssSource, /\.trip-review-header\.is-editing #trip-title,[\s\S]*\.trip-review-header\.is-editing #trip-review-description\s*\{[\s\S]*display: none;/);
    assert.match(cssSource, /\.trip-review-header\.is-editing \.trip-edit-fields\s*\{[\s\S]*display: grid;/);
    assert.match(cssSource, /\.trip-edit-fields label\s*\{[\s\S]*display: none;/);
    assert.match(cssSource, /\.trip-edit-fields input\s*\{[\s\S]*border: 0;[\s\S]*border-bottom: 1px solid var\(--line\);[\s\S]*background: transparent;/);
    assert.match(cssSource, /#trip-edit-title\s*\{[\s\S]*font-size: clamp\(40px, 7vw, 92px\);[\s\S]*text-align: center;/);
});

test('album edit mode can add text blocks between photos and persist them in album note metadata', () => {
    assert.match(appSource, /ALBUM_STORY_MARKER/);
    assert.match(appSource, /function getAlbumVisibleNote/);
    assert.match(appSource, /function serializeAlbumNoteWithStory/);
    assert.match(appSource, /data-add-trip-story-after/);
    assert.match(appSource, /data-remove-trip-story/);
    assert.doesNotMatch(appSource, /trip-review-photo-card[\s\S]*trip-review-add-text/);
    assert.match(appSource, /class="trip-review-story-insert"[\s\S]*data-add-trip-story-after/);
    assert.match(appSource, /child\.classList\?\.contains\('trip-review-story-insert'\) \|\| child\.classList\?\.contains\('trip-review-story-block'\)/);
    assert.match(appSource, /class="trip-review-story-block/);
    assert.match(appSource, /collectAlbumStoryEntriesFromDOM/);
    assert.match(appSource, /const addTripStoryButton = event\.target\.closest\('\[data-add-trip-story-after\]'\)/);
    assert.match(cssSource, /\.trip-review-story-block\s*\{/);
    assert.match(cssSource, /\.trip-review-story-insert\s*\{/);
    assert.match(cssSource, /\.trip-review-photo-card\.is-removing\s*\{[\s\S]*transform: scale\(0\.94\);[\s\S]*opacity: 0;/);
    assert.match(cssSource, /\.trip-review-photo-card\.is-editing:hover \.trip-review-photo-remove/);
});

test('album detail exposes date map filters and a clear state', () => {
    assert.match(appSource, /data-trip-review-date/);
    assert.match(appSource, /data-clear-trip-review-date/);
    assert.match(appSource, /tripReviewDateFilter/);
});

test('album detail keeps the map card focused without an inactive large-map button', () => {
    assert.doesNotMatch(appSource, /data-open-trip-map/);
    assert.match(cssSource, /@media \(max-height: 760px\) and \(min-width: 901px\)/);
    assert.match(cssSource, /position:\s*relative;[\s\S]*top:\s*auto;/);
});

test('photo detail can hand off a selected photo to Explore', () => {
    const htmlSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

    assert.match(htmlSource, /data-show-photo-on-map/);
    assert.match(appSource, /state\.explorePhotoScope = photo\.owner_id === state\.currentUser\?\.id \? 'mine' : 'others'/);
    assert.match(appSource, /routeTo\(APP_SECTIONS\.EXPLORE\)/);
    assert.match(appSource, /openExplorePhotoPreview\(photo, \{ focusMap: true \}\)/);
    assert.match(appSource, /getExplorePinIcon\(maps, \{ type: 'photo', selected \}\)/);
    assert.match(cssSource, /\.trip-review-photo-card\.is-map-focused/);
});

test('album detail map refreshes after first render and date filter updates', () => {
    assert.match(appSource, /tripReviewMapRenderToken:\s*0/);
    assert.match(appSource, /const renderToken = \+\+state\.tripReviewMapRenderToken/);
    assert.match(appSource, /await waitForTripReviewMapContainer\(container, renderToken\)/);
    assert.match(appSource, /if \(renderToken !== state\.tripReviewMapRenderToken\) return/);
    assert.match(appSource, /function waitForTripReviewMapContainer/);
    assert.match(appSource, /function refreshTripReviewMapViewport/);
    assert.match(appSource, /maps\.event\.trigger\(state\.tripReviewMap, 'resize'\)/);
    assert.match(appSource, /requestAnimationFrame\(\(\) => refreshTripReviewMapViewport/);
});

test('album detail map shows lightweight loading feedback while the viewport changes', () => {
    assert.match(appSource, /function setTripReviewMapLoading/);
    assert.match(appSource, /tripReviewMapPanel\?\.classList\.toggle\('is-loading', isLoading\)/);
    assert.match(appSource, /지도 이동 중/);
    assert.match(appSource, /setTripReviewMapLoading\(true\);[\s\S]*renderTripReviewMap\(state\.albumDetailPhotos\)/);
    assert.match(appSource, /setTripReviewMapLoading\(false\)/);
    assert.match(cssSource, /\.trip-review-map-loading/);
    assert.match(cssSource, /\.trip-review-map-panel\.is-loading\s+\.trip-review-map-loading/);
});

test('album detail map hides Google default corner controls', () => {
    assert.match(appSource, /state\.tripReviewMap = new maps\.Map\(container, withGoogleMapsMapId\(\{[\s\S]*disableDefaultUI: true,[\s\S]*fullscreenControl: false,[\s\S]*streetViewControl: false,[\s\S]*rotateControl: false,[\s\S]*scaleControl: false,[\s\S]*zoomControl: false,[\s\S]*cameraControl: false,[\s\S]*panControl: false,[\s\S]*keyboardShortcuts: false,/);
    assert.doesNotMatch(appSource, /<strong>앨범 지도<\/strong>/);
});
