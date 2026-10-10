import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildContentShare, parseSharedPhotoId } from '../js/content-sharing.mjs';
import { getKakaoSharePayload } from '../js/kakao-share.mjs';

test('public photos and albums have crawlable URLs and their own thumbnail endpoint', () => {
    for (const type of ['photo', 'album']) {
        const content = buildContentShare('https://example.com', type, { id: 'abc', visibility: 'public', title: '부산 여행' });
        assert.equal(content.url, `https://example.com/share/${type}/abc`);
        assert.equal(content.imageUrl, `${content.url}?image=1`);
        const payload = getKakaoSharePayload(content.url, content);
        assert.equal(payload.content.imageUrl, content.imageUrl);
        assert.equal(payload.content.title, '부산 여행');
    }
});
test('private items, unsaved photos and unsupported types cannot be shared', () => {
    for (const item of [{ id: 'a', visibility: 'private' }, { visibility: 'public' }]) {
        assert.equal(buildContentShare('https://example.com', 'photo', item), null);
    }
    assert.equal(buildContentShare('https://example.com', 'profile', { id: 'a', visibility: 'public' }), null);
});
test('photo share destinations preserve exact IDs', () => {
    assert.equal(parseSharedPhotoId('#/?photo=abc%2F123'), 'abc/123');
    assert.equal(parseSharedPhotoId('#/trip?album=123'), null);
});
