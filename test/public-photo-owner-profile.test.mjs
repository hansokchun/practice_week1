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
});

test('photo owner profile route preserves the owner when there is no public album', () => {
    assert.match(source, /selectedPublicOwnerId:\s*null/);
    assert.match(source, /state\.selectedPublicOwnerId = ownerId \|\| ownerAlbum\?\.owner_id \|\| null/);
    assert.match(source, /routeTo\('profile'\)/);
});

test('Explore restores the selected public photo preview when no public album exists', () => {
    const fnStart = source.indexOf('function renderPublicSurfaces()');
    const fnEnd = source.indexOf('if (state.albumDetailEditMode', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /const selectedPhoto = explorePhotos\.find\(\(photo\) => photo\.id === state\.selectedPhotoId\) \|\| explorePhotos\[0\]/);
    assert.match(body, /updateExplorePhotoPreview\(selectedPhoto\)/);
    assert.match(body, /renderPublicOwnerProfile\(state\.selectedPublicOwnerId, explorePhotos\)/);
});
