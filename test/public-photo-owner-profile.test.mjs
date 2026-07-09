import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('js/app.js', 'utf8');

test('public profile names are loaded from public photo owners as well as albums', () => {
    const fnStart = source.indexOf('async function loadPublicProfileNames()');
    const fnEnd = source.indexOf('function renderSavedPhotoSurfaces()', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /state\.savedPhotos/);
    assert.match(body, /photo\.owner_id/);
    assert.match(body, /photo\.shared \|\| \['public', 'link'\]\.includes\(photo\.visibility\)/);
    assert.match(body, /getProfileUserId\(profile\)/);
    assert.match(body, /getProfileDisplayName\(profile\)/);
});

test('photo owner profile route preserves the owner when there is no public album', () => {
    assert.match(source, /selectedPublicOwnerId:\s*null/);
    assert.match(source, /state\.selectedPublicOwnerId = ownerId \|\| ownerAlbum\?\.owner_id \|\| null/);
    assert.match(source, /buildOwnerProfileHash\(state\.selectedPublicOwnerId\)/);
});

test('profile route prefers the selected owner even when a public album is currently selected', () => {
    const fnStart = source.indexOf('function renderPublicSurfaces()');
    const fnEnd = source.indexOf('state.selectedPublicOwnerId = selected.owner_id || state.selectedPublicOwnerId;', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /if \(document\.body\.dataset\.page === 'profile' && state\.selectedPublicOwnerId\) \{\s*renderPublicOwnerProfile\(state\.selectedPublicOwnerId, explorePhotos\);\s*return;\s*\}/s);
});

test('public profile actions pass the clicked owner id through the route handler', () => {
    assert.match(source, /profileButton\.dataset\.publicOwnerId = ownerId/);
    assert.match(source, /const ownerAlbum = albumId/);
    assert.match(source, /state\.selectedPublicOwnerId = ownerId \|\| ownerAlbum\?\.owner_id \|\| null/);
    assert.match(source, /routeToProfileFromAuthor\(button\.dataset\.publicAlbumId, button\.dataset\.publicOwnerId\)/);
});

test('profile route restores owner id from the hash after refresh', () => {
    const fnStart = source.indexOf('function applyRouteHash');
    const fnEnd = source.indexOf('function updateExplorePhotoScopeControls', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /if \(sharedRoute\.ownerId\)/);
    assert.match(body, /state\.selectedPublicOwnerId = sharedRoute\.ownerId/);
    assert.match(body, /if \(sharedRoute\.albumId \|\| sharedRoute\.ownerId\) renderPublicSurfaces\(\)/);
});

test('Explore restores a selected public photo preview only when that photo still exists', () => {
    const fnStart = source.indexOf('function renderPublicSurfaces()');
    const fnEnd = source.indexOf('if (state.albumDetailEditMode', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(source, /function getSelectedExploreAlbum\(albums = getPublicAlbums\(\)\)/);
    assert.match(body, /document\.body\.dataset\.page === APP_SECTIONS\.EXPLORE\s*\?\s*getSelectedExploreAlbum\(albums\)\s*:\s*getSelectedPublicAlbum\(albums\)/s);
    assert.match(body, /const selectedPhoto = explorePhotos\.find\(\(photo\) => photo\.id === state\.selectedPhotoId\)/);
    assert.doesNotMatch(body, /\|\| explorePhotos\[0\]/);
    assert.match(body, /updateExplorePhotoPreview\(selectedPhoto\)/);
    assert.match(body, /renderPublicOwnerProfile\(state\.selectedPublicOwnerId, explorePhotos\)/);
});
