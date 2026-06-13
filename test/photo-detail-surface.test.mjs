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
    assert.match(css, /\.photo-detail-card\s*\{[^}]*align-items:\s*start;/s);
    assert.match(css, /\.photo-detail-card section\s*\{[^}]*align-self:\s*start;/s);
    assert.match(css, /\.photo-detail-card > img\s*\{[^}]*padding:\s*clamp\(18px,\s*4vh,\s*48px\)\s*0;/s);
    assert.match(css, /\.photo-detail-map\s*\{[^}]*order:\s*6;/s);
    assert.match(css, /\.photo-detail-map,\s*\.location-editor-map\s*\{/s);
    assert.match(css, /\.photo-detail-map\[hidden\]\s*\{[^}]*display:\s*none !important;/s);
});

test('photo detail click handling separates album photos from individual photos', () => {
    const source = readFileSync('js/app.js', 'utf8');

    assert.match(source, /const isTripPhoto = Boolean\(photoCard\.closest\('#public-trip-photo-grid'\)\)/);
    assert.match(source, /context: isTripPhoto \? 'album' : 'photo'/);
    assert.match(source, /document\.body\.dataset\.page === 'trip' \? 'album' : 'photo'/);
});
