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
    assert.match(cssSource, /\.trip-review-map-panel\s*\{[\s\S]*border-radius: 20px/);
    assert.match(cssSource, /\.trip-review-map\s*\{[\s\S]*height: 390px/);
    assert.match(cssSource, /\.trip-review-map-panel\s*\{[\s\S]*margin-top: 30px/);
    assert.match(cssSource, /\.trip-review-layout\s*\{[\s\S]*gap: 36px/);
});

test('album detail renders a large fading photo cover above the timeline', () => {
    assert.match(appSource, /id="trip-review-cover-image" class="trip-review-cover-image"/);
    assert.match(appSource, /const tripReviewCoverImage = \$\('#trip-review-cover-image'\)/);
    assert.match(appSource, /tripReviewCoverImage\.src = cover/);
    assert.match(cssSource, /\.trip-review-header\s*\{[\s\S]*min-height: clamp\(460px, 58vh, 640px\);[\s\S]*align-items: end;[\s\S]*border-bottom: 0;/);
    assert.match(cssSource, /\.trip-review-cover-image\s*\{[\s\S]*object-fit: cover;[\s\S]*filter: blur\(5px\) saturate\(0\.9\) brightness\(0\.88\);/);
    assert.match(cssSource, /\.trip-review-header::after\s*\{[\s\S]*linear-gradient\(180deg, rgba\(249, 247, 242, 0\), rgba\(249, 247, 242, 0\.86\) 58%, var\(--warm\)\)/);
    assert.match(cssSource, /\.trip-review-layout\s*\{[\s\S]*margin-top: calc\(-1 \* 66px\);/);
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

test('photo detail can hand off a selected photo to the album map', () => {
    const htmlSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

    assert.match(htmlSource, /data-show-photo-on-map/);
    assert.match(appSource, /tripReviewFocusPhotoId/);
    assert.match(appSource, /closeModals\(\);[\s\S]*updateTripReviewDateFilterUI\(\);[\s\S]*renderTripReviewMap\(state\.albumDetailPhotos\)/);
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
