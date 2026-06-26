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

test('photo detail modal exposes fullscreen, more, report, and nearby photo actions', () => {
    const html = readFileSync('index.html', 'utf8');
    const detailStart = html.indexOf('id="photo-detail-modal"');
    const detailEnd = html.indexOf('id="location-editor-modal"', detailStart);
    const detail = html.slice(detailStart, detailEnd);
    const fullscreenStart = html.indexOf('id="photo-fullscreen-modal"');
    const fullscreenEnd = html.indexOf('id="location-editor-modal"', fullscreenStart);
    const fullscreen = html.slice(fullscreenStart, fullscreenEnd);

    assert.match(detail, /data-photo-detail-image/);
    assert.match(detail, /data-open-photo-fullscreen/);
    assert.match(detail, /data-photo-detail-more/);
    assert.match(detail, /data-photo-detail-more-menu/);
    assert.match(detail, /data-report-photo/);
    assert.match(detail, /data-photo-detail-nearby/);
    assert.match(detail, /data-photo-detail-nearby-list/);
    assert.match(detail, />주변사진</);
    assert.doesNotMatch(detail, />Nearby</);
    assert.match(fullscreen, /data-photo-fullscreen-image/);
    assert.match(fullscreen, /data-close-photo-fullscreen/);
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
    assert.match(source, /showOnMapButton\.hidden = !canShowOnTripMap/);
    assert.match(source, /modal\.dataset\.photoDetailImageSrc = photo\.url \|\| 'images\/main_bg2\.jpg'/);
    assert.match(source, /const nearbyPhotos = getNearbyDetailPhotos\(photo\)/);
    assert.match(source, /data-photo-detail-nearby-photo="\$\{escapeHtml\(nearbyPhoto\.id\)\}"/);
    assert.match(source, /function openPhotoFullscreenFromDetail\(\)/);
    assert.match(source, /sourceImage\?\.currentSrc \|\| sourceImage\?\.src \|\| detailModal\?\.dataset\.photoDetailImageSrc/);
    assert.match(source, /function setPhotoDetailMoreMenuOpen\(isOpen\)/);
    assert.match(css, /\.photo-detail-card\s*\{[^}]*align-items:\s*start;/s);
    assert.match(css, /\.photo-detail-card section\s*\{[^}]*align-self:\s*start;/s);
    assert.match(css, /\.photo-detail-card > img\s*\{[^}]*padding:\s*clamp\(18px,\s*4vh,\s*48px\)\s*0;/s);
    assert.match(css, /\.photo-detail-zoom-button\s*\{[^}]*position:\s*absolute;[^}]*border-radius:\s*999px;/s);
    assert.match(css, /\.photo-detail-more-menu\s*\{[^}]*position:\s*absolute;[^}]*min-width:\s*132px;/s);
    assert.match(css, /\.photo-detail-nearby__grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/s);
    assert.match(css, /\.photo-fullscreen-card img\s*\{[^}]*object-fit:\s*contain;/s);
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

    assert.match(source, /event\.target\.closest\('\[data-open-photo-fullscreen\]'\)/);
    assert.match(source, /openPhotoFullscreenFromDetail\(\)/);
    assert.match(source, /event\.target\.closest\('\[data-close-photo-fullscreen\]'\)/);
    assert.match(source, /closePhotoFullscreenModal\(\)/);
    assert.match(source, /event\.target\.closest\('\[data-photo-detail-more\]'\)/);
    assert.match(source, /setPhotoDetailMoreMenuOpen\(!isOpen\)/);
    assert.match(source, /event\.target\.closest\('\[data-report-photo\]'\)/);
    assert.match(source, /신고가 접수되었습니다/);
    assert.match(source, /event\.target\.closest\('\[data-photo-detail-nearby-photo\]'\)/);
    assert.match(source, /updatePhotoDetailModal\(photo \|\| getDefaultDetailPhoto\(\), \{ context: detailContext \}\)/);
});
