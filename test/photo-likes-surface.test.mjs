import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('photo detail exposes like action and total like count', () => {
    const html = readFileSync('index.html', 'utf8');
    const detailStart = html.indexOf('id="photo-detail-modal"');
    const detailEnd = html.indexOf('id="location-editor-modal"', detailStart);
    const detail = html.slice(detailStart, detailEnd);

    assert.match(detail, /id="photo-detail-like"/);
    assert.match(detail, /data-toggle-photo-like/);
    assert.match(detail, /id="photo-detail-like-count"/);
    assert.doesNotMatch(detail, /data-like-label/);
});

test('Explore photo preview exposes a heart-only like control', () => {
    const html = readFileSync('index.html', 'utf8');
    const previewStart = html.indexOf('id="explore-pin-preview"');
    const previewEnd = html.indexOf('id="explore-list"', previewStart);
    const preview = html.slice(previewStart, previewEnd);

    assert.match(preview, /id="pin-preview-like"/);
    assert.match(preview, /data-toggle-photo-like/);
    assert.match(preview, /aria-label="좋아요"/);
    assert.doesNotMatch(preview, /data-like-label/);
});

test('Explore discovery photo cards rely on the preview panel like control', () => {
    const source = readFileSync('js/app.js', 'utf8');
    const rendererStart = source.indexOf('function renderExploreDiscoveryPanel');
    const rendererEnd = source.indexOf('async function ensureExploreMap', rendererStart);
    const renderer = source.slice(rendererStart, rendererEnd);
    const previewStart = source.indexOf('function updateExplorePhotoPreview');
    const previewEnd = source.indexOf('function setExploreDiscoverySelection', previewStart);
    const preview = source.slice(previewStart, previewEnd);

    assert.doesNotMatch(renderer, /class="photo-like-button explore-discovery-like-button/);
    assert.doesNotMatch(renderer, /data-like-surface="explore-discovery"/);
    assert.match(preview, /const likeButton = \$\('#pin-preview-like'\)/);
    assert.match(preview, /likeButton\.dataset\.photoId = photo\.id \|\| ''/);
    assert.match(preview, /likeButton\.classList\.toggle\('is-liked', isLiked\)/);
});

test('home has a liked photos section with an all-liked route action', () => {
    const html = readFileSync('index.html', 'utf8');
    const homeStart = html.indexOf('class="home-workspace');
    const homeEnd = html.indexOf('id="page-photos"', homeStart);
    const home = html.slice(homeStart, homeEnd);

    assert.match(home, /id="liked-photo-grid"/);
    assert.match(home, /id="btn-open-liked-photos"/);
    assert.match(home, /id="liked-photo-title"/);
});

test('app tracks liked photo ids and renders liked photo surfaces', () => {
    const source = readFileSync('js/app.js', 'utf8');

    assert.match(source, /fetchMyLikes/);
    assert.match(source, /insertLike/);
    assert.match(source, /deleteLike/);
    assert.match(source, /toggleLikePhoto/);
    assert.match(source, /likedPhotoIds:\s*\[\]/);
    assert.match(source, /function renderLikedPhotoSurfaces/);
    assert.match(source, /async function toggleSelectedPhotoLike/);
    assert.match(source, /data-like-surface="home"/);
    assert.doesNotMatch(source, /dataset\.photoDetailContext !== 'explore'/);
});

test('photo like writes tolerate duplicate rows and counter permission gaps', () => {
    const auth = readFileSync('auth.js', 'utf8');
    const app = readFileSync('js/app.js', 'utf8');

    assert.match(auth, /function isDuplicateLikeError/);
    assert.match(auth, /error\?\.code === '23505'/);
    assert.match(auth, /user_likes_pkey/);
    assert.match(auth, /return \{ error: null, alreadyLiked: true \}/);
    assert.match(auth, /function isLikeCounterPermissionError/);
    assert.match(auth, /permission denied for function \(increment_like\|decrement_like\)/);
    assert.match(auth, /return \{ error: null, counterSkipped: true \}/);
    assert.match(app, /const countResult = likeRowResult\.alreadyLiked/);
    assert.match(app, /const delta = nextLiked && likeRowResult\.alreadyLiked \? 0 : \(nextLiked \? 1 : -1\)/);
    assert.doesNotMatch(app, /showToast\(likeRowResult\.error\.message/);
    assert.doesNotMatch(app, /showToast\(countResult\.error\.message/);
});
