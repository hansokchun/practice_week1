import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildContentShare, parseSharedPhotoId } from '../js/content-sharing.mjs';
import { getKakaoSharePayload } from '../js/kakao-share.mjs';
import { readFileSync } from 'node:fs';

test('public photos and albums have crawlable URLs and their own thumbnail endpoint', () => {
    for (const type of ['photo', 'album']) {
        const content = buildContentShare('https://example.com', type, { id: 'abc', visibility: 'public', title: '부산 여행' });
        assert.equal(content.url, `https://example.com/share/${type}/abc?v=2`);
        assert.equal(content.imageUrl, `${content.url}&image=1`);
        assert.equal(content.description, '장소 아카이브');
        const payload = getKakaoSharePayload(content.url, content);
        assert.equal(payload.content.imageUrl, content.imageUrl);
        assert.equal(payload.content.title, '부산 여행');
    }
});
test('album cover changes version the shared link and image without depending on signed tokens', () => {
    const cover = path => `https://project.supabase.co/storage/v1/object/sign/photos/${path}?token=old`;
    const first = buildContentShare('https://example.com', 'album', { id: 'a', visibility: 'public', cover_url: cover('owner/one.jpg') });
    const renewed = buildContentShare('https://example.com', 'album', { id: 'a', visibility: 'public', cover_url: cover('owner/one.jpg').replace('old','new') });
    const second = buildContentShare('https://example.com', 'album', { id: 'a', visibility: 'public', cover_url: cover('owner/two.jpg') });
    assert.equal(first.url, renewed.url);
    assert.notEqual(first.url, second.url);
    assert.notEqual(first.imageUrl, second.imageUrl);
    assert.equal(new URL(second.imageUrl).searchParams.get('image'), '1');
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

test('untitled shared photos use neutral metadata and the modal has no generic scene caption', () => {
    const content = buildContentShare('https://example.com', 'photo', { id: '1', visibility: 'public' });
    assert.equal(content.title, '이끼 사진');
    const html = readFileSync('index.html', 'utf8');
    assert.doesNotMatch(html, /id="content-share-name"/);
    assert.match(html, /class="content-share-link-row"/);
    const css = readFileSync('style.css', 'utf8');
    assert.match(css, /\.content-share-card \.modal-close\s*\{[^}]*display: grid;[^}]*place-items: center;[^}]*padding: 0;/s);
});
