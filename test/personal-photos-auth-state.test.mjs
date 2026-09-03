import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('My Photos distinguishes a signed-out session from an empty library', () => {
    const start = source.indexOf('function renderPersonalPhotosPage');
    const end = source.indexOf('async function refreshPersonalPhotoPage', start);
    const renderSource = source.slice(start, end);

    const signedOutIndex = renderSource.indexOf('if (!state.currentUser)');
    const emptyLibraryIndex = renderSource.indexOf('if (!photos.length)');

    assert.ok(signedOutIndex >= 0);
    assert.ok(emptyLibraryIndex > signedOutIndex);
    assert.match(renderSource, /로그인 후 내 사진을 확인하세요/);
    assert.match(renderSource, /data-open-auth-modal/);
});

test('the signed-out My Photos action opens the shared auth modal', () => {
    assert.match(source, /closest\('\[data-open-auth-modal\]'\)/);
    assert.match(source, /if \(openAuthButton\) \{\s*openModal\('#auth-modal'\);/s);
});
