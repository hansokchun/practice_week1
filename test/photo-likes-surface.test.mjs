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

test('Explore discovery photo cards expose a direct like control', () => {
    const source = readFileSync('js/app.js', 'utf8');
    const rendererStart = source.indexOf('function renderExploreDiscoveryPanel');
    const rendererEnd = source.indexOf('async function ensureExploreMap', rendererStart);
    const renderer = source.slice(rendererStart, rendererEnd);

    assert.match(renderer, /class="photo-like-button explore-discovery-like-button/);
    assert.match(renderer, /data-like-surface="explore-discovery"/);
    assert.match(renderer, /isLiked = Boolean\(photo\.id && state\.likedPhotoIds\.includes\(String\(photo\.id\)\)\)/);
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
