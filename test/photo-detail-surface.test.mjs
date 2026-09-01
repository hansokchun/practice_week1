import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('photo detail modal shows visibility only for the current user photo', () => {
    const html = readFileSync('index.html', 'utf8');

    assert.equal(html.includes('<dt>Album</dt>'), false);
    assert.equal(html.includes('<dt>Visibility</dt>'), false);
    assert.equal(html.includes('<dt>Original</dt>'), false);
    assert.match(html, /id="photo-detail-map"/);
    assert.match(html, /id="photo-detail-map-canvas"/);
    assert.equal(html.includes('id="btn-expand-photo-map"'), false);
    assert.equal(html.includes('class="map-expand-button"'), false);
    assert.match(html, /id="photo-detail-visibility"/);
    assert.match(html, /data-show-photo-on-map/);
    assert.match(html, /data-show-photo-on-map[^>]*>[\s\S]*?location_on[\s\S]*?지도에서 찾기/);
    assert.doesNotMatch(html, /data-show-photo-on-map[^>]*class="[^"]*nav-create/);

    const source = readFileSync('js/app.js', 'utf8');
    assert.match(source, /visibilityValue\.hidden = !canEdit/);
});

test('photo detail presents a concise AI analysis heading and vertically centered map action', () => {
    const html = readFileSync('index.html', 'utf8');
    const css = readFileSync('style.css', 'utf8');

    assert.match(html, /id="photo-detail-ai-status">AI 분석<\/strong>/);
    assert.match(css, /\.detail-actions \[data-show-photo-on-map\]\s*\{[^}]*display:\s*inline-flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;/s);
});

test('photo detail surface leads with description and compact info before the map', () => {
    const html = readFileSync('index.html', 'utf8');
    const detailStart = html.indexOf('id="photo-detail-modal"');
    const detailEnd = html.indexOf('id="location-editor-modal"', detailStart);
    const detail = html.slice(detailStart, detailEnd);

    assert.match(detail, /id="photo-detail-description"/);
    assert.match(detail, /id="photo-detail-author"/);
    assert.match(detail, /id="photo-detail-author-name"/);
    assert.match(detail, />올린 사람</);
    assert.match(detail, /class="photo-detail-meta"/);
    assert.match(detail, /<a data-photo-detail-meta="place"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
    assert.ok(detail.indexOf('id="photo-detail-description"') < detail.indexOf('class="photo-detail-meta"'));
    assert.ok(detail.indexOf('class="photo-detail-meta"') < detail.indexOf('id="photo-detail-map"'));
    assert.doesNotMatch(detail, /id="photo-detail-title"/);
});

test('photo detail modal exposes close navigation, fullscreen, more, and report without nearby photos', () => {
    const html = readFileSync('index.html', 'utf8');
    const detailStart = html.indexOf('id="photo-detail-modal"');
    const detailEnd = html.indexOf('id="location-editor-modal"', detailStart);
    const detail = html.slice(detailStart, detailEnd);
    const fullscreenStart = html.indexOf('id="photo-fullscreen-modal"');
    const fullscreenEnd = html.indexOf('id="location-editor-modal"', fullscreenStart);
    const fullscreen = html.slice(fullscreenStart, fullscreenEnd);

    assert.match(detail, /data-photo-detail-image/);
    assert.match(detail, /data-close-modal/);
    assert.match(detail, /aria-label="닫기"/);
    assert.doesNotMatch(detail, /data-photo-detail-back/);
    assert.match(detail, /<img[^>]*data-open-photo-fullscreen/);
    assert.doesNotMatch(detail, /photo-detail-zoom-button/);
    assert.doesNotMatch(detail, /Archival Photo/);
    assert.match(detail, /data-photo-detail-more/);
    assert.match(detail, /data-photo-detail-more-menu/);
    assert.match(detail, />more_vert</);
    assert.ok(detail.indexOf('data-photo-detail-more-menu') < detail.indexOf('data-open-photo-editor'));
    assert.match(detail, /data-report-photo/);
    assert.doesNotMatch(detail, /data-photo-detail-nearby/);
    assert.doesNotMatch(detail, /data-photo-detail-nearby-list/);
    assert.doesNotMatch(detail, />주변사진</);
    assert.doesNotMatch(detail, />×</);
    assert.match(detail, /class="photo-detail-title-row"/);
    assert.ok(detail.indexOf('id="photo-detail-description"') < detail.indexOf('data-photo-detail-more'));
    assert.match(detail, /data-photo-detail-scroll-cue/);
    assert.match(fullscreen, /data-photo-fullscreen-image/);
    assert.match(fullscreen, /data-photo-fullscreen-back/);
    assert.doesNotMatch(fullscreen, /data-close-photo-fullscreen/);
    assert.doesNotMatch(fullscreen, />×</);
});

test('photo detail renderer writes compact metadata and map handoff controls', () => {
    const source = readFileSync('js/app.js', 'utf8');
    const css = readFileSync('style.css', 'utf8');

    assert.equal(source.includes('albumValue'), false);
    assert.equal(source.includes('originalValue'), false);
    assert.match(source, /const mapShell = \$\('#photo-detail-map'\)/);
    assert.match(source, /const mapCanvas = \$\('#photo-detail-map-canvas'\)/);
    assert.match(source, /getPhotoDetailOwnerMapItems\(/);
    assert.match(source, /getPhotoDetailMapViewport\(photo\)/);
    assert.equal(source.includes('btn-expand-photo-map'), false);
    assert.match(source, /function updatePhotoDetailModal\(photo = getDefaultDetailPhoto\(\), \{ context = 'photo' \} = \{\}\)/);
    assert.match(source, /modal\.dataset\.photoDetailContext = context/);
    assert.match(source, /void renderPhotoDetailMap\(photo\)/);
    assert.match(source, /state\.photoDetailMap\.setCenter\(viewport\.center\)/);
    assert.match(source, /state\.photoDetailMap\.setZoom\(viewport\.zoom\)/);
    assert.match(source, /selected: item\.isSelected/);
    assert.match(source, /authorButton\.dataset\.publicOwnerId = ownerId/);
    assert.match(source, /setAvatarDisplay\(authorImage, authorFallback, authorProfile\.avatarUrl, authorProfile\.nickname\)/);
    assert.match(source, /photo-detail-visibility/);
    assert.match(source, /visibilityValue\.innerHTML = `<span class="material-symbols-outlined">\$\{isPublicPhoto \? 'public' : 'lock'\}<\/span> \$\{isPublicPhoto \? '공개' : '비공개'\}`/);
    assert.match(source, /showOnMapButton\.hidden = !canShowOnExploreMap/);
    assert.match(source, /const dateLabel =[^;]+: '-- --'/s);
    assert.match(source, /const googleMapsLocationUrl = getGoogleMapsLocationUrl\(photo\.lat, photo\.lng\)/);
    assert.match(source, /placeMeta\.href = googleMapsLocationUrl/);
    assert.match(source, /placeMeta\.removeAttribute\('href'\)/);
    assert.match(source, /async function openPhotoOnExploreMap\(photo\)/);
    assert.match(source, /window\.setTimeout\(resolve, 32\)/);
    assert.match(source, /await ensureExploreMap\(\)/);
    assert.match(source, /openExplorePhotoPreview\(photo, \{ focusMap: true \}\)/);
    assert.match(source, /getLandingPublicPhotos\(\)\.find\(\(candidate\) => String\(candidate\.id \|\| candidate\.localId\) === photoId\)/);
    assert.match(source, /const photoImageSrc = getPhotoImageSrc\(photo\)/);
    assert.match(source, /modal\.dataset\.photoDetailImageSrc = photoImageSrc/);
    assert.match(source, /modal\.dataset\.photoDetailImageFallbackSrc = getPhotoImageFallbackSrc\(photo, photoImageSrc\)/);
    assert.match(source, /setImageSourceWithFallback\(image, photoImageSrc, getPhotoImageFallbackSrc\(photo, photoImageSrc\)\)/);
    assert.doesNotMatch(source, /function getNearbyDetailPhotos\(/);
    assert.doesNotMatch(source, /function renderPhotoDetailNearby\(/);
    assert.doesNotMatch(source, /renderPhotoDetailNearby\(photo, context\)/);
    assert.match(source, /function openPhotoFullscreenFromDetail\(\)/);
    assert.match(source, /sourceImage\?\.dataset\.fallbackApplied === 'true'/);
    assert.match(source, /const fallbackSource = detailModal\?\.dataset\.photoDetailImageFallbackSrc \|\| renderedSource \|\| MAIN_BG_2_URL/);
    assert.match(source, /setImageSourceWithFallback\(fullscreenImage, source, fallbackSource\)/);
    assert.match(source, /setPhotoDetailMoreMenuOpen\(false\)/);
    assert.match(source, /document\.body\.classList\.add\('photo-fullscreen-open'\)/);
    assert.match(source, /document\.body\.classList\.remove\('photo-fullscreen-open'\)/);
    assert.doesNotMatch(source, /detailModal\.classList\.remove\('is-open'\)/);
    assert.doesNotMatch(source, /detailModal\.setAttribute\('aria-hidden', 'true'\)/);
    assert.doesNotMatch(source, /function goBackFromPhotoDetail\(\)/);
    assert.match(source, /function returnToPhotoDetailFromFullscreen\(\)/);
    assert.match(source, /function setPhotoDetailMoreMenuOpen\(isOpen\)/);
    assert.match(css, /\.photo-detail-card\s*\{[^}]*align-items:\s*stretch;[^}]*max-height:\s*calc\(100vh - 48px\);/s);
    const detailCardBlock = css.match(/\.photo-detail-card\s*\{(?<block>[^}]*)\}/s)?.groups?.block ?? '';
    assert.doesNotMatch(detailCardBlock, /^\s*height:\s*calc\(100vh - 48px\);/m);
    assert.match(css, /\.photo-detail-card section\s*\{[^}]*align-self:\s*stretch;[^}]*max-height:\s*calc\(100vh - 48px\);/s);
    assert.match(css, /\.photo-detail-card > img\s*\{[^}]*height:\s*min\(76vh,\s*760px\);[^}]*padding:\s*clamp\(32px,\s*5vh,\s*60px\)\s*clamp\(28px,\s*4vw,\s*56px\);/s);
    assert.match(css, /\.photo-detail-card section\s*\{[^}]*background:\s*#ffffff;/s);
    assert.doesNotMatch(css, /\.photo-detail-zoom-button\s*\{/);
    assert.match(css, /\.photo-detail-meta > span,\s*\.photo-detail-meta > a\s*\{[^}]*border-radius:\s*0;[^}]*background:\s*transparent;/s);
    assert.match(css, /\.photo-detail-visibility\s*\{[^}]*display:\s*inline-flex;[^}]*border-radius:\s*0;[^}]*background:\s*transparent;/s);
    assert.match(css, /\.photo-detail-visibility \.material-symbols-outlined\s*\{[^}]*color:\s*#475556;/s);
    assert.match(css, /\.photo-detail-more-menu\s*\{[^}]*position:\s*absolute;[^}]*min-width:\s*132px;/s);
    assert.match(css, /\.photo-detail-scroll-cue\s*\{[^}]*position:\s*sticky;[^}]*pointer-events:\s*none;/s);
    assert.doesNotMatch(css, /\.photo-detail-nearby/);
    assert.match(css, /\.photo-fullscreen-modal\s*\{[^}]*z-index:\s*140;[^}]*align-items:\s*stretch;[^}]*padding:\s*0;/s);
    assert.match(css, /body\.photo-fullscreen-open\s*\{[^}]*overflow:\s*hidden;/s);
    assert.match(css, /\.photo-fullscreen-card\s*\{[^}]*width:\s*100vw;[^}]*height:\s*100svh;[^}]*overflow:\s*hidden;/s);
    assert.match(css, /\.photo-fullscreen-card img\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*max-width:\s*none;[^}]*max-height:\s*none;[^}]*object-fit:\s*contain;/s);
    assert.match(css, /\.photo-fullscreen-card img\s*\{[^}]*padding:\s*max\(16px,\s*env\(safe-area-inset-top\)\)/s);
    assert.match(css, /\.photo-detail-close\s*\{[^}]*position:\s*static;[^}]*border-radius:\s*999px;/s);
    assert.match(css, /\.photo-fullscreen-back\s*\{[^}]*left:\s*max\(12px,\s*env\(safe-area-inset-left\)\);/s);
    assert.match(css, /\.photo-detail-map\s*\{[^}]*order:\s*6;/s);
    assert.match(css, /\.photo-detail-map,\s*\.location-editor-map\s*\{/s);
    assert.match(css, /\.photo-detail-map\[hidden\]\s*\{[^}]*display:\s*none !important;/s);
    assert.match(css, /\.photo-detail-author\s*\{[^}]*grid-template-columns:\s*40px minmax\(0, 1fr\) 20px;/s);
    assert.match(css, /\.photo-detail-map-canvas,\s*\.location-editor-map-canvas\s*\{/s);
});

test('photo detail click handling separates album photos from individual photos', () => {
    const source = readFileSync('js/app.js', 'utf8');

    assert.match(source, /const isTripPhoto = Boolean\(photoCard\.closest\('#public-trip-photo-grid'\)\)/);
    assert.match(source, /const isLikedPhoto = Boolean\(photoCard\.closest\('#liked-photo-grid, #liked-photo-full-grid'\)\)/);
    assert.match(source, /document\.body\.dataset\.page === 'tag' \? 'explore' : 'album'/);
    assert.match(source, /: \(isLikedPhoto \? 'liked' : 'photo'\)/);
    assert.match(source, /document\.body\.dataset\.page === 'trip' \? 'album' : 'photo'/);
});

test('photo detail click handling opens fullscreen and reports without nearby photo switching', () => {
    const source = readFileSync('js/app.js', 'utf8');

    assert.doesNotMatch(source, /event\.target\.closest\('\[data-photo-detail-back\]'\)/);
    assert.doesNotMatch(source, /goBackFromPhotoDetail\(\)/);
    assert.match(source, /event\.target\.closest\('\[data-open-photo-fullscreen\]'\)/);
    assert.match(source, /openPhotoFullscreenFromDetail\(\)/);
    assert.match(source, /event\.target\.closest\('\[data-photo-fullscreen-back\]'\)/);
    assert.match(source, /returnToPhotoDetailFromFullscreen\(\)/);
    assert.match(source, /event\.target\.closest\('\[data-photo-detail-more\]'\)/);
    assert.match(source, /setPhotoDetailMoreMenuOpen\(!isOpen\)/);
    assert.match(source, /event\.target\.closest\('\[data-report-photo\]'\)/);
    assert.match(source, /신고가 접수되었습니다/);
    assert.doesNotMatch(source, /event\.target\.closest\('\[data-photo-detail-nearby-photo\]'\)/);
});
