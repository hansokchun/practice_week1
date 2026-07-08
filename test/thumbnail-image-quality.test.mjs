import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = () => readFileSync('js/app.js', 'utf8');

test('thumbnail images use higher quality Supabase render variants', () => {
    const app = appSource();

    assert.match(app, /const SUPABASE_STORAGE_OBJECT_PUBLIC_PATH = '\/storage\/v1\/object\/public\/';/);
    assert.match(app, /const SUPABASE_STORAGE_RENDER_PUBLIC_PATH = '\/storage\/v1\/render\/image\/public\/';/);
    assert.match(app, /const THUMBNAIL_IMAGE_WIDTHS = \[640, 960, 1280\];/);
    assert.match(app, /const THUMBNAIL_IMAGE_QUALITY = 92;/);
    assert.match(app, /url\.pathname = url\.pathname\.replace\(SUPABASE_STORAGE_OBJECT_PUBLIC_PATH, SUPABASE_STORAGE_RENDER_PUBLIC_PATH\);/);
    assert.match(app, /url\.searchParams\.set\('width', String\(width\)\);/);
    assert.match(app, /url\.searchParams\.set\('quality', String\(THUMBNAIL_IMAGE_QUALITY\)\);/);
});

test('home and explore thumbnail surfaces render responsive image markup', () => {
    const app = appSource();
    const homeStart = app.indexOf('function renderSavedPhotoSurfaces');
    const homeEnd = app.indexOf('function renderLikedPhotoSurfaces', homeStart);
    const homeRenderer = app.slice(homeStart, homeEnd);
    const exploreStart = app.indexOf('function renderExploreDiscoveryPanel');
    const exploreEnd = app.indexOf('async function ensureExploreMap', exploreStart);
    const exploreRenderer = app.slice(exploreStart, exploreEnd);
    const albumStart = app.indexOf('function getAlbumCoverLayerMarkup');
    const albumEnd = app.indexOf('function renderHomeAlbumsSection', albumStart);
    const albumRenderer = app.slice(albumStart, albumEnd);

    assert.match(homeRenderer, /getThumbnailImageMarkup\(photo\.url, getPhotoFallbackLabel\(photo\), \{ sizes: '\(max-width: 860px\) calc\(\(100vw - 48px\) \/ 2\), 300px' \}\)/);
    assert.match(exploreRenderer, /getThumbnailImageMarkup\(photo\.url \|\| photo\.albumCoverUrl \|\| 'images\/main_bg2\.jpg', description \|\| label, \{ sizes: '390px' \}\)/);
    assert.match(albumRenderer, /getThumbnailImageMarkup\(source, '', \{ sizes: '248px' \}\)/);
    assert.match(app, /const srcsetMarkup = srcset \? ` srcset="\$\{escapeHtml\(srcset\)\}" sizes="\$\{escapeHtml\(sizes\)\}"` : '';/);
});
