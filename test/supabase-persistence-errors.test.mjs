import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('js/app.js', 'utf8');

test('album save flow handles album-photo replacement failures', () => {
    assert.match(source, /const \{ error: replaceError \} = await replaceAlbumPhotos\(savedAlbum\.id, draftPhotoIds\);/);
    assert.match(source, /if \(replaceError\) \{/);
    assert.match(source, /showToast\('앨범 사진 연결에 실패했습니다\.'\);/);
});

test('album save flow does not change individual photo visibility', () => {
    const fnStart = source.indexOf('async function saveAlbumAndOpenDetail()');
    const fnEnd = source.indexOf('function getDraftAlbumInput()', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /await replaceAlbumPhotos\(savedAlbum\.id, draftPhotoIds\)/);
    assert.doesNotMatch(body, /updatePhotosVisibility\(draftPhotoIds, state\.visibility\)/);
    assert.doesNotMatch(body, /photoVisibilityError/);
});

test('share flow handles photo visibility update failures', () => {
    assert.doesNotMatch(source, /const publicLocationPrecision/);
    assert.match(source, /const \{ data: updatedPhotos, error: photoVisibilityError \} = await updatePhotosVisibility\(photoIds, state\.visibility\);/);
    assert.match(source, /if \(photoVisibilityError\) throw photoVisibilityError;/);
    assert.match(source, /showToast\(error\?\.message \|\| '공개 설정을 저장하지 못했습니다\.'\);/);
});

test('new share album is discarded if photo attachment fails', () => {
    assert.match(source, /const \{ error: attachError \} = await attachPhotosToAlbum\(album\.id, photoIds\);/);
    assert.match(source, /if \(attachError\) \{/);
    assert.match(source, /await deleteAlbum\(album\.id\);/);
});
