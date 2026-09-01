import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const app = readFileSync('js/app.js', 'utf8');
const css = readFileSync('style.css', 'utf8');

test('profile exposes map, my photos, and albums tabs in Korean', () => {
    assert.match(html, /data-profile-tab="map"[^>]*>맵뷰/);
    assert.match(html, /data-profile-tab="photos"[^>]*>내 사진/);
    assert.match(html, /data-profile-tab="albums"[^>]*>앨범/);
    assert.match(html, /id="profile-map"/);
    assert.match(html, /class="profile-photo-panel" data-profile-panel="photos"/);
    assert.match(html, /id="profile-owner-map-heading"[^>]*hidden/);
});

test('own profile keeps photo and album navigation visible', () => {
    const layoutStart = app.indexOf('function setProfileOwnershipLayout');
    const layoutEnd = app.indexOf('function renderPublicOwnerProfile', layoutStart);
    const layout = app.slice(layoutStart, layoutEnd);
    const ownerStart = app.indexOf('function renderPublicOwnerProfile');
    const ownerEnd = app.indexOf('function renderTripReviewShell', ownerStart);
    const ownerBody = app.slice(ownerStart, ownerEnd);

    assert.match(layout, /profileTabs\.hidden = false/);
    assert.match(layout, /ownerMapHeading\.hidden = true/);
    assert.match(layout, /panel\.hidden = false/);
    assert.match(layout, /setProfileTab\(state\.profileTab\)/);
    assert.match(ownerBody, /setProfileOwnershipLayout\(isOwnProfile\)/);
    assert.match(css, /\.profile-tabs\[hidden\]\s*\{[^}]*display:\s*none;/s);
});

test('public empty-state refresh does not overwrite the active profile ownership layout', () => {
    const emptyStart = app.indexOf('function renderEmptyPublicSurfaces');
    const emptyEnd = app.indexOf('function setProfileOwnershipLayout', emptyStart);
    const emptyBody = app.slice(emptyStart, emptyEnd);

    assert.doesNotMatch(emptyBody, /setProfileOwnershipLayout\(false\)/);
});

test('profile tab state supports photos separately from albums', () => {
    const fnStart = app.indexOf('function setProfileTab');
    const fnEnd = app.indexOf('function openMyphotoAlbum', fnStart);
    const body = app.slice(fnStart, fnEnd);

    assert.match(body, /\['map', 'photos', 'albums'\]\.includes\(tab\)/);
    assert.match(body, /panel\.dataset\.profilePanel === state\.profileTab/);
});

test('public owner profile renders separate map, photo, and album panels', () => {
    const fnStart = app.indexOf('function renderPublicOwnerProfile');
    const fnEnd = app.indexOf('function renderTripReviewShell', fnStart);
    const body = app.slice(fnStart, fnEnd);

    assert.match(body, /const ownerPhotos = isOwnProfile\s*\? getMySavedPhotos\(\)\s*:\s*getPublicOwnerProfilePhotos\(publicPhotos, ownerId\)/s);
    assert.match(body, /const ownerAlbums = state\.savedAlbums\.filter\([\s\S]*isOwnProfile \|\| album\.visibility === 'public'/s);
    assert.match(body, /getProfilePhotoPreview\(ownerPhotos, \{ seed: ownerId, limit: 7 \}\)/);
    assert.match(body, /buildOwnerProfilePhotosHash\(ownerId\)/);
    assert.match(body, /isOwnProfile \? '#\/photos' : buildOwnerProfilePhotosHash\(ownerId\)/);
    assert.match(body, /getOwnerProfileMapPhotos\([\s\S]*state\.savedPhotos\.map\(normalizePhotoMapItem\)[\s\S]*state\.currentUser\?\.id[\s\S]*\)/);
    assert.match(body, /renderProfileMap\(profileMapPhotos\)/);
    assert.match(body, /const profilePhotoGrid = \$\('\.profile-photo-grid'\)/);
    assert.match(body, /const profileAlbumGrid = \$\('\.profile-album-grid'\)/);
});

test('public profile photo grids omit visible fallback titles without descriptions', () => {
    const ownerStart = app.indexOf('function renderPublicOwnerProfile');
    const ownerEnd = app.indexOf('function renderTripReviewShell', ownerStart);
    const ownerBody = app.slice(ownerStart, ownerEnd);
    const selectedStart = app.indexOf('function renderPublicSurfaces');
    const selectedEnd = app.indexOf('async function loadSavedPhotos', selectedStart);
    const selectedBody = app.slice(selectedStart, selectedEnd);

    assert.match(ownerBody, /const description = getPhotoDescriptionText\(photo\)/);
    assert.match(ownerBody, /\$\{description \? `[\s\S]*<strong>\$\{escapeHtml\(description\)\}<\/strong>[\s\S]*` : ''\}/);
    assert.doesNotMatch(ownerBody, /<strong>\$\{escapeHtml\(getPhotoFallbackLabel\(photo/);
    assert.match(selectedBody, /const description = getPhotoDescriptionText\(photo\)/);
    assert.match(selectedBody, /\$\{description \? `[\s\S]*<strong>\$\{escapeHtml\(description\)\}<\/strong>[\s\S]*` : ''\}/);
    assert.doesNotMatch(selectedBody, /<strong>\$\{escapeHtml\(getPhotoFallbackLabel\(photo/);
});

test('public profile photo thumbnails preserve original photo ratios', () => {
    assert.match(css, /\.profile-photo-panel\.is-active\s*\{[^}]*display:\s*block;/s);
    assert.match(css, /\.profile-photo-grid\s*\{[^}]*column-count:\s*3;[^}]*column-gap:\s*18px;/s);
    assert.match(css, /\.profile-photo-grid article\s*\{[^}]*break-inside:\s*avoid;[^}]*margin:\s*0 0 18px;/s);
    assert.match(css, /\.profile-photo-grid img\s*\{[^}]*width:\s*100%;[^}]*height:\s*auto;[^}]*object-fit:\s*contain;/s);
    assert.doesNotMatch(css, /\.profile-photo-grid img,\s*\.profile-album-grid img\s*\{[^}]*height:\s*180px;/s);
});

test('public profile map uses Google Maps JS with greedy wheel gestures and inert markers', () => {
    assert.match(app, /async function ensureProfileMap/);
    assert.match(app, /getExploreMapOptions\(\{/);
    assert.match(app, /state\.profileMarkers = locatedPhotos\.map/);
    const fnStart = app.indexOf('async function renderProfileMap');
    const fnEnd = app.indexOf('function renderPublicOwnerProfile', fnStart);
    const body = app.slice(fnStart, fnEnd);

    assert.doesNotMatch(body, /addListener\('click'/);
    assert.match(app, /profileMapZoomListener/);
    assert.match(body, /getProfileMapPinIcon\(maps, map\.getZoom\?\.\(\)\)/);
    assert.match(body, /updateProfileMapMarkerSizes\(maps, map\)/);
});
