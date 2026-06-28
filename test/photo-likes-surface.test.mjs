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
    assert.match(detail, /id="photo-detail-like-count">0<\/span>/);
    assert.doesNotMatch(detail, /좋아요 0개/);
    assert.doesNotMatch(detail, /data-like-label/);
});

test('Explore photo preview does not expose an inline like control', () => {
    const html = readFileSync('index.html', 'utf8');
    const previewStart = html.indexOf('id="explore-pin-preview"');
    const previewEnd = html.indexOf('id="explore-list"', previewStart);
    const preview = html.slice(previewStart, previewEnd);

    assert.doesNotMatch(preview, /id="pin-preview-like"/);
    assert.doesNotMatch(preview, /data-toggle-photo-like/);
    assert.doesNotMatch(preview, /pin-preview-like-panel/);
    assert.doesNotMatch(preview, /data-like-label/);
});

test('Explore discovery and preview surfaces rely on the shared photo detail like control', () => {
    const source = readFileSync('js/app.js', 'utf8');
    const rendererStart = source.indexOf('function renderExploreDiscoveryPanel');
    const rendererEnd = source.indexOf('async function ensureExploreMap', rendererStart);
    const renderer = source.slice(rendererStart, rendererEnd);
    const previewStart = source.indexOf('function updateExplorePhotoPreview');
    const previewEnd = source.indexOf('function setExploreDiscoverySelection', previewStart);
    const preview = source.slice(previewStart, previewEnd);

    assert.doesNotMatch(renderer, /class="photo-like-button explore-discovery-like-button/);
    assert.doesNotMatch(renderer, /data-like-surface="explore-discovery"/);
    assert.doesNotMatch(preview, /pin-preview-like/);
    assert.doesNotMatch(preview, /likeButton\.dataset\.photoId = photo\.id \|\| ''/);
    assert.match(preview, /updatePhotoDetailModal\(photo, \{ context: 'explore' \}\)/);
});

test('home has a liked photos section with an all-liked route action', () => {
    const html = readFileSync('index.html', 'utf8');
    const homeStart = html.indexOf('class="home-workspace');
    const homeEnd = html.indexOf('id="page-photos"', homeStart);
    const home = html.slice(homeStart, homeEnd);

    assert.match(home, /id="liked-photo-grid"/);
    assert.match(home, /id="btn-open-liked-photos"[^>]*data-route="liked"/);
    assert.match(home, /id="liked-photo-title"/);
});

test('liked photos page uses the Korean title without extra intro or section copy', () => {
    const html = readFileSync('index.html', 'utf8');
    const source = readFileSync('js/app.js', 'utf8');
    const likedStart = html.indexOf('id="page-liked"');
    const likedEnd = html.indexOf('id="page-upload"', likedStart);
    const likedPage = html.slice(likedStart, likedEnd);

    assert.match(likedPage, /<h1 id="liked-photos-title">좋아요한 사진<\/h1>/);
    assert.doesNotMatch(likedPage, /Liked Photos/);
    assert.doesNotMatch(likedPage, /Explore와 사진 상세에서 좋아요를 누른 사진을 한곳에 모아 봅니다\./);
    assert.doesNotMatch(likedPage, /좋아요 모음/);
    assert.doesNotMatch(source, /#btn-open-liked-photos'\)\?\.addEventListener\('click', \(\) => routeTo\('liked'\)\)/);
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
    assert.doesNotMatch(source, /data-like-surface="home"/);
    assert.doesNotMatch(source, /liked-photo-like-button/);
    assert.match(source, /const canLike = \['photo', 'explore', 'liked'\]\.includes\(context\)/);
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

test('home photo detail like updates do not refresh the Explore preview photo', () => {
    const app = readFileSync('js/app.js', 'utf8');
    const fnStart = app.indexOf('async function toggleSelectedPhotoLike');
    const fnEnd = app.indexOf('function getCurrentAccountProfile', fnStart);
    const body = app.slice(fnStart, fnEnd);

    assert.match(body, /const detailContext = \$\('#photo-detail-modal'\)\?\.dataset\.photoDetailContext \|\| 'photo'/);
    assert.match(body, /if \(state\.selectedPhotoId && String\(state\.selectedPhotoId\) === String\(photo\.id\)\) \{/);
    assert.match(body, /if \(detailContext === 'explore'\) \{[\s\S]*updateExplorePhotoPreview\(updatedPhoto \|\| photo\);[\s\S]*\} else \{[\s\S]*updatePhotoDetailModal\(updatedPhoto \|\| photo, \{ context: detailContext \}\);[\s\S]*\}/);
});
