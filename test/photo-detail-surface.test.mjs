import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('photo detail modal shows only the photo visibility status block', () => {
    const html = readFileSync('index.html', 'utf8');

    assert.equal(html.includes('<dt>Album</dt>'), false);
    assert.equal(html.includes('<dt>Visibility</dt>'), false);
    assert.equal(html.includes('<dt>Original</dt>'), false);
    assert.equal(html.includes('id="photo-detail-map"'), false);
    assert.equal(html.includes('id="photo-detail-map-frame"'), false);
    assert.equal(html.includes('id="btn-expand-photo-map"'), false);
    assert.equal(html.includes('class="map-expand-button"'), false);
    assert.match(html, /id="photo-detail-visibility"/);
    assert.match(html, /data-show-photo-on-map/);
});

test('photo detail renderer writes compact metadata and map handoff controls', () => {
    const source = readFileSync('js/app.js', 'utf8');
    const css = readFileSync('style.css', 'utf8');

    assert.equal(source.includes('albumValue'), false);
    assert.equal(source.includes('originalValue'), false);
    assert.equal(source.includes("const map = $('#photo-detail-map')"), false);
    assert.equal(source.includes("const mapFrame = $('#photo-detail-map-frame')"), false);
    assert.equal(source.includes('getPhotoMapUrl(photo)'), false);
    assert.equal(source.includes('btn-expand-photo-map'), false);
    assert.match(source, /function updatePhotoDetailModal\(photo = getDefaultDetailPhoto\(\), \{ context = 'photo' \} = \{\}\)/);
    assert.match(source, /modal\.dataset\.photoDetailContext = context/);
    assert.match(source, /context === 'album'/);
    assert.match(source, /photo-detail-visibility/);
    assert.match(source, /showOnMapButton\.hidden = !canShowOnTripMap/);
    assert.match(css, /\.photo-detail-card\s*\{[^}]*align-items:\s*start;/s);
    assert.match(css, /\.photo-detail-card section\s*\{[^}]*align-self:\s*start;/s);
});

test('photo detail click handling separates album photos from individual photos', () => {
    const source = readFileSync('js/app.js', 'utf8');

    assert.match(source, /const isTripPhoto = Boolean\(photoCard\.closest\('#public-trip-photo-grid'\)\)/);
    assert.match(source, /context: isTripPhoto \? 'album' : 'photo'/);
    assert.match(source, /document\.body\.dataset\.page === 'trip' \? 'album' : 'photo'/);
});
