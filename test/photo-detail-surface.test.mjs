import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('photo detail modal shows only the photo visibility status block', () => {
    const html = readFileSync('index.html', 'utf8');

    assert.equal(html.includes('<dt>Album</dt>'), false);
    assert.equal(html.includes('<dt>Visibility</dt>'), false);
    assert.equal(html.includes('<dt>Original</dt>'), false);
    assert.match(html, /id="photo-detail-map"/);
    assert.match(html, /id="photo-detail-map-frame"/);
    assert.equal(html.includes('id="btn-expand-photo-map"'), false);
    assert.equal(html.includes('class="map-expand-button"'), false);
    assert.match(html, /id="photo-detail-visibility"/);
    assert.match(html, /data-show-photo-on-map/);
});

test('photo detail surface leads with description and compact info before the map', () => {
    const html = readFileSync('index.html', 'utf8');
    const detailStart = html.indexOf('id="photo-detail-modal"');
    const detailEnd = html.indexOf('id="location-editor-modal"', detailStart);
    const detail = html.slice(detailStart, detailEnd);

    assert.match(detail, /id="photo-detail-description"/);
    assert.match(detail, /class="photo-detail-meta"/);
    assert.ok(detail.indexOf('id="photo-detail-description"') < detail.indexOf('class="photo-detail-meta"'));
    assert.ok(detail.indexOf('class="photo-detail-meta"') < detail.indexOf('id="photo-detail-map"'));
    assert.doesNotMatch(detail, /id="photo-detail-title"/);
});

test('photo detail modal exposes close navigation, fullscreen, more, report, and nearby photo actions', () => {
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
    assert.match(detail, /data-photo-detail-nearby/);
    assert.match(detail, /data-photo-detail-nearby-list/);
    assert.match(detail, />주변사진</);
    assert.doesNotMatch(detail, />Nearby</);
    assert.doesNotMatch(detail, />×</);
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
    assert.match(source, /const map = \$\('#photo-detail-map'\)/);
    assert.match(source, /const mapFrame = \$\('#photo-detail-map-frame'\)/);
    assert.match(source, /getPhotoMapUrl\(photo\)/);
    assert.equal(source.includes('btn-expand-photo-map'), false);
    assert.match(source, /function updatePhotoDetailModal\(photo = getDefaultDetailPhoto\(\), \{ context = 'photo' \} = \{\}\)/);
    assert.match(source, /modal\.dataset\.photoDetailContext = context/);
    assert.match(source, /context === 'album'/);
    assert.match(source, /if \(map && mapFrame\)/);
    assert.match(source, /context === 'photo' \? getPhotoMapUrl\(photo\) : ''/);
    assert.match(source, /photo-detail-visibility/);
    assert.match(source, /visibilityValue\.innerHTML = `<span class="material-symbols-outlined">\$\{isPublicPhoto \? 'public' : 'lock'\}<\/span> \$\{isPublicPhoto \? '공개' : '비공개'\}`/);
    assert.match(source, /showOnMapButton\.hidden = !canShowOnTripMap/);
    assert.match(source, /const photoImageSrc = getPhotoImageSrc\(photo\)/);
    assert.match(source, /modal\.dataset\.photoDetailImageSrc = photoImageSrc/);
    assert.match(source, /modal\.dataset\.photoDetailImageFallbackSrc = getPhotoImageFallbackSrc\(photo, photoImageSrc\)/);
    assert.match(source, /setImageSourceWithFallback\(image, photoImageSrc, getPhotoImageFallbackSrc\(photo, photoImageSrc\)\)/);
    assert.match(source, /function getPhotoDetailSourcePhotos\(context\)/);
    assert.match(source, /function getNearbyDetailPhotos\(photo, context\)/);
    assert.match(source, /if \(context !== 'explore'\) \{[\s\S]*nearbySection\.hidden = true;[\s\S]*nearbyList\.innerHTML = '';[\s\S]*return;[\s\S]*\}/);
    assert.match(source, /const nearbyPhotos = getNearbyDetailPhotos\(photo, context\)/);
    assert.match(source, /data-photo-detail-nearby-photo="\$\{escapeHtml\(nearbyPhoto\.id \|\| nearbyPhoto\.localId \|\| ''\)\}"/);
    assert.match(source, /renderPhotoDetailNearby\(photo, context\)/);
    assert.match(source, /function openPhotoFullscreenFromDetail\(\)/);
    assert.match(source, /sourceImage\?\.dataset\.fallbackApplied === 'true'/);
    assert.match(source, /const fallbackSource = detailModal\?\.dataset\.photoDetailImageFallbackSrc \|\| renderedSource \|\| 'images\/main_bg2\.jpg'/);
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
    assert.match(css, /\.photo-detail-card > img\s*\{[^}]*height:\s*min\(76vh,\s*760px\);[^}]*padding:\s*clamp\(18px,\s*4vh,\s*48px\)\s*clamp\(12px,\s*2vw,\s*24px\);/s);
    assert.match(css, /\.photo-detail-card section\s*\{[^}]*background:\s*var\(--surface-muted\);/s);
    assert.doesNotMatch(css, /\.photo-detail-zoom-button\s*\{/);
    assert.match(css, /\.photo-detail-meta span\s*\{[^}]*border-radius:\s*8px;[^}]*background:\s*var\(--bg\);/s);
    assert.match(css, /\.photo-detail-visibility\s*\{[^}]*display:\s*inline-flex;[^}]*border-radius:\s*8px;[^}]*background:\s*var\(--bg\);/s);
    assert.match(css, /\.photo-detail-visibility \.material-symbols-outlined\s*\{[^}]*color:\s*var\(--teal-dark\);/s);
    assert.match(css, /\.photo-detail-more-menu\s*\{[^}]*position:\s*absolute;[^}]*min-width:\s*132px;/s);
    assert.match(css, /\.photo-detail-nearby__grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/s);
    assert.match(css, /\.photo-detail-nearby__item\s*\{[^}]*aspect-ratio:\s*1 \/ 1;[^}]*border-radius:\s*0;/s);
    assert.match(css, /\.photo-fullscreen-modal\s*\{[^}]*z-index:\s*140;[^}]*align-items:\s*stretch;[^}]*padding:\s*0;/s);
    assert.match(css, /body\.photo-fullscreen-open\s*\{[^}]*overflow:\s*hidden;/s);
    assert.match(css, /\.photo-fullscreen-card\s*\{[^}]*width:\s*100vw;[^}]*height:\s*100svh;[^}]*overflow:\s*hidden;/s);
    assert.match(css, /\.photo-fullscreen-card img\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*max-width:\s*none;[^}]*max-height:\s*none;[^}]*object-fit:\s*contain;/s);
    assert.match(css, /\.photo-fullscreen-card img\s*\{[^}]*padding:\s*max\(16px,\s*env\(safe-area-inset-top\)\)/s);
    assert.match(css, /\.photo-detail-close\s*\{[^}]*position:\s*absolute;[^}]*right:\s*14px;[^}]*border-radius:\s*999px;/s);
    assert.match(css, /\.photo-fullscreen-back\s*\{[^}]*left:\s*max\(12px,\s*env\(safe-area-inset-left\)\);/s);
    assert.match(css, /\.photo-detail-map\s*\{[^}]*order:\s*6;/s);
    assert.match(css, /\.photo-detail-map,\s*\.location-editor-map\s*\{/s);
    assert.match(css, /\.photo-detail-map\[hidden\]\s*\{[^}]*display:\s*none !important;/s);
});

test('photo detail click handling separates album photos from individual photos', () => {
    const source = readFileSync('js/app.js', 'utf8');

    assert.match(source, /const isTripPhoto = Boolean\(photoCard\.closest\('#public-trip-photo-grid'\)\)/);
    assert.match(source, /const isLikedPhoto = Boolean\(photoCard\.closest\('#liked-photo-grid, #liked-photo-full-grid'\)\)/);
    assert.match(source, /const context = isTripPhoto \? 'album' : \(isLikedPhoto \? 'liked' : 'photo'\)/);
    assert.match(source, /document\.body\.dataset\.page === 'trip' \? 'album' : 'photo'/);
});

test('photo detail click handling opens fullscreen, reports, and switches nearby photos', () => {
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
    assert.match(source, /event\.target\.closest\('\[data-photo-detail-nearby-photo\]'\)/);
    assert.match(source, /const detailContext = \$\('#photo-detail-modal'\)\?\.dataset\.photoDetailContext \|\| 'photo'/);
    assert.match(source, /if \(detailContext === 'explore'\) \{[\s\S]*updateExplorePhotoPreview\(nearbyPhoto\);[\s\S]*\} else \{[\s\S]*updatePhotoDetailModal\(nearbyPhoto, \{ context: detailContext \}\)/);
});
