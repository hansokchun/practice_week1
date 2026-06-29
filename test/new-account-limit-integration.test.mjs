import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('js/app.js', 'utf8');

test('upload flow checks new account upload limits before persisting files', () => {
    const start = source.indexOf('async function persistStagedPhotos()');
    const end = source.indexOf('async function saveAlbumDraft()', start);
    const body = source.slice(start, end);

    assert.match(body, /enforceNewAccountLimit\('upload', \{\s*incomingUploadCount: selectedPhotos\.length\s*\}\)/s);
    assert.match(body, /enforceAccountUploadLimit\(selectedPhotos\.length\)/);
    assert.ok(body.indexOf("enforceNewAccountLimit('upload'") < body.indexOf('enforceAccountUploadLimit(selectedPhotos.length)'));
});

test('upload page surfaces the account-wide one hundred photo limit', () => {
    const renderStart = source.indexOf('function renderStagedPhotos()');
    const renderEnd = source.indexOf('function renderAlbumComposePage()', renderStart);
    const renderBody = source.slice(renderStart, renderEnd);

    assert.match(source, /from '\.\/upload-account-limit\.mjs'/);
    assert.match(renderBody, /getAccountUploadLimitStatus\(\{\s*user: state\.currentUser,\s*photos: state\.savedPhotos,\s*incomingUploadCount: selectedUploadCount\s*\}\)/s);
    assert.match(renderBody, /reviewButton\.disabled = !selectedUploadCount \|\| isUploadLimitBlocked/);
    assert.match(renderBody, /남은 업로드 가능 수/);
});

test('share and edit flows check new account public limits before publishing photos', () => {
    const shareStart = source.indexOf('async function saveShareSettings()');
    const shareEnd = source.indexOf('function setProfileTab', shareStart);
    const shareBody = source.slice(shareStart, shareEnd);

    const editorStart = source.indexOf('async function saveManualLocation(event)');
    const editorEnd = source.indexOf('async function searchExploreMap', editorStart);
    const editorBody = source.slice(editorStart, editorEnd);

    const albumStart = source.indexOf('async function toggleSelectedAlbumVisibility()');
    const albumEnd = source.indexOf('async function setSelectedAlbumCoverFromFirstPhoto()', albumStart);
    const albumBody = source.slice(albumStart, albumEnd);

    assert.match(shareBody, /enforceNewAccountLimit\('publish', \{\s*requestedVisibility: state\.visibility,\s*incomingPublicCount: getPhotosBecomingPublic\(getSharePhotoIds\(\)\)\s*\}\)/s);
    assert.match(editorBody, /enforceNewAccountLimit\('publish', \{\s*requestedVisibility: state\.editingPhotoVisibility,\s*incomingPublicCount: getPhotosBecomingPublic\(\[photo\.id\]\)\s*\}\)/s);
    assert.match(albumBody, /enforceNewAccountLimit\('publish', \{\s*requestedVisibility: nextVisibility,\s*incomingPublicCount: getPhotosBecomingPublic\(state\.albumDetailPhotos\.map\(\(photo\) => photo\.id\)\)\s*\}\)/s);
});
