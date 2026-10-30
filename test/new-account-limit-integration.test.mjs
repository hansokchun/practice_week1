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

test('upload page keeps the account limit gate without a remaining-count prefix', () => {
    const renderStart = source.indexOf('function renderStagedPhotos()');
    const renderEnd = source.indexOf('function renderAlbumComposePage()', renderStart);
    const renderBody = source.slice(renderStart, renderEnd);

    assert.match(source, /from '\.\/upload-account-limit\.mjs'/);
    assert.match(renderBody, /getAccountUploadLimitStatus\(\{\s*user: state\.currentUser,\s*photos: state\.savedPhotos,\s*incomingUploadCount: selectedUploadCount\s*\}\)/s);
    assert.match(renderBody, /reviewButton\.disabled = !selectedUploadCount \|\| isUploadLimitBlocked/);
    assert.match(renderBody, /isUploadLimitBlocked\s*\? getAccountUploadLimitMessage\(uploadLimitStatus\)/);
    assert.doesNotMatch(renderBody, /남은 업로드 가능 수|uploadLimitStatus\.remainingUploads/);
});

test('upload status never renders Infinity and preserves privacy and blocked-account guidance', () => {
    const renderStart = source.indexOf('function renderStagedPhotos()');
    const renderEnd = source.indexOf('function renderAlbumComposePage()', renderStart);
    const renderBody = source.slice(renderStart, renderEnd);
    const statusExpression = renderBody.match(/uploadStorageStatus\.textContent = ([\s\S]*?);\r?\n/)?.[1];
    assert.ok(statusExpression, 'the upload status assignment must remain available');
    const statusText = new Function('isUploadLimitBlocked', 'uploadLimitStatus', 'state', 'getAccountUploadLimitMessage', `return ${statusExpression};`);
    const user = { id: 'member' };
    for (const remainingUploads of [Infinity, 100, 3, 0]) {
        assert.equal(statusText(false, { remainingUploads }, { currentUser: user }), '모든 사진은 기본 비공개로 저장됩니다.');
    }
    assert.equal(statusText(false, {}, { currentUser: null }), '로그인 후 선택한 사진을 비공개로 저장합니다.');
    const blockedStatus = { canUpload: false };
    assert.equal(statusText(true, blockedStatus, { currentUser: user }, status => {
        assert.equal(status, blockedStatus);
        return '업로드 한도 안내';
    }), '업로드 한도 안내');
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
