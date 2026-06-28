import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const app = readFileSync('js/app.js', 'utf8');
const css = readFileSync('style.css', 'utf8');

test('public profile exposes Map View, photos, and albums tabs', () => {
    assert.match(html, /data-profile-tab="map"[^>]*>Map View/);
    assert.match(html, /data-profile-tab="photos"[^>]*>사진/);
    assert.match(html, /data-profile-tab="albums"[^>]*>앨범/);
    assert.match(html, /id="profile-map"/);
    assert.match(html, /class="profile-photo-grid" data-profile-panel="photos"/);
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

    assert.match(body, /const ownerAlbums = getSavedPublicAlbums\(\)\.filter/);
    assert.match(body, /renderProfileMap\(ownerPhotos\)/);
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
    assert.match(css, /\.profile-photo-grid\.is-active\s*\{[^}]*display:\s*block;/s);
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
});
