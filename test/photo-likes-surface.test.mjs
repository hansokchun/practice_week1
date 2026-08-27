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

test('Explore photo preview exposes a heart-only like control and count', () => {
    const html = readFileSync('index.html', 'utf8');
    const previewStart = html.indexOf('id="explore-pin-preview"');
    const previewEnd = html.indexOf('id="explore-list"', previewStart);
    const preview = html.slice(previewStart, previewEnd);

    assert.match(preview, /id="pin-preview-like"/);
    assert.match(preview, /data-toggle-photo-like/);
    assert.match(preview, /class="pin-preview-like-panel"/);
    assert.match(preview, /id="pin-preview-like-count">0<\/span>/);
    assert.match(preview, /<span class="material-symbols-outlined">favorite<\/span>/);
    assert.doesNotMatch(preview, /data-like-label/);
});

test('Explore discovery cards stay image-only while the preview syncs its like control', () => {
    const source = readFileSync('js/app.js', 'utf8');
    const rendererStart = source.indexOf('function renderExploreDiscoveryPanel');
    const rendererEnd = source.indexOf('async function ensureExploreMap', rendererStart);
    const renderer = source.slice(rendererStart, rendererEnd);
    const previewStart = source.indexOf('function updateExplorePhotoPreview');
    const previewEnd = source.indexOf('function setExploreDiscoverySelection', previewStart);
    const preview = source.slice(previewStart, previewEnd);

    assert.doesNotMatch(renderer, /class="photo-like-button explore-discovery-like-button/);
    assert.doesNotMatch(renderer, /data-like-surface="explore-discovery"/);
    assert.match(preview, /const likeButton = preview\.querySelector\('#pin-preview-like'\)/);
    assert.match(preview, /likeButton\.dataset\.photoId = photo\.id \|\| ''/);
    assert.match(preview, /likeButton\.setAttribute\('aria-pressed', isLiked \? 'true' : 'false'\)/);
    assert.match(preview, /likeCount\.textContent = String\(likeTotal\)/);
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
    assert.match(source, /#btn-open-liked-photos'\)\?\.addEventListener\('click', \(event\) => \{[\s\S]*event\.stopImmediatePropagation\(\);[\s\S]*routeTo\('liked'\);[\s\S]*\}, true\);/);
    assert.doesNotMatch(source, /#btn-open-liked-photos'\)\?\.addEventListener\('click', \(\) => routeTo\('liked'\)\)/);
});

test('app tracks liked photo ids and renders liked photo surfaces', () => {
    const source = readFileSync('js/app.js', 'utf8');
    const css = readFileSync('style.css', 'utf8');

    assert.match(source, /fetchMyLikes/);
    assert.match(source, /setPhotoLike/);
    assert.doesNotMatch(source, /insertLike/);
    assert.doesNotMatch(source, /deleteLike/);
    assert.doesNotMatch(source, /toggleLikePhoto/);
    assert.match(source, /likedPhotoIds:\s*\[\]/);
    assert.match(source, /function renderLikedPhotoSurfaces/);
    assert.match(source, /async function toggleSelectedPhotoLike/);
    assert.doesNotMatch(source, /data-like-surface="home"/);
    assert.doesNotMatch(source, /liked-photo-like-button/);
    assert.match(source, /const canLike = \['photo', 'explore', 'liked'\]\.includes\(context\)/);
    assert.doesNotMatch(source, /dataset\.photoDetailContext !== 'explore'/);
    assert.match(source, /playPhotoLikeSnap\(likeButton\)/);
    assert.match(css, /\.photo-like-button\.is-snapping/);
    assert.match(css, /@keyframes photoLikeSnap/);
});

test('photo like writes use one authenticated RPC and trust its exact count', () => {
    const auth = readFileSync('auth.js', 'utf8');
    const app = readFileSync('js/app.js', 'utf8');
    const migration = readFileSync('supabase/migrations/20260810092619_synchronize_photo_likes.sql', 'utf8');

    assert.match(auth, /export async function setPhotoLike\(photoId, isLiking\)/);
    assert.match(auth, /\.rpc\('set_photo_like', \{/);
    assert.match(auth, /target_photo_id: photoId/);
    assert.match(auth, /should_like: Boolean\(isLiking\)/);
    assert.match(app, /const \{ likedCount, error \} = await setPhotoLike\(photo\.id, nextLiked\)/);
    assert.match(app, /liked: likedCount/);
    assert.doesNotMatch(app, /const delta =/);

    assert.match(migration, /CREATE OR REPLACE FUNCTION public\.set_photo_like/);
    assert.match(migration, /auth\.uid\(\)/);
    assert.match(migration, /ON CONFLICT \(user_id, photo_id\) DO NOTHING/i);
    assert.match(migration, /DELETE FROM public\.user_likes[\s\S]*user_id = current_user_id/i);
    assert.match(migration, /SELECT count\(\*\)::integer/);
    assert.match(migration, /UPDATE public\.photos[\s\S]*SET liked = new_like_count/i);
    assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.set_photo_like\(text, boolean\) TO authenticated/i);
    assert.match(migration, /UPDATE public\.photos AS photo[\s\S]*SELECT count\(\*\)::integer/i);
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
