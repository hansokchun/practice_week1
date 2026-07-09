import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = () => readFileSync('js/app.js', 'utf8');
const stylesheet = () => readFileSync('style.css', 'utf8');

test('photo thumbnails use moderate Supabase render variants', () => {
    const app = appSource();

    assert.match(app, /const SUPABASE_STORAGE_OBJECT_PUBLIC_PATH = '\/storage\/v1\/object\/public\/';/);
    assert.match(app, /const SUPABASE_STORAGE_RENDER_PUBLIC_PATH = '\/storage\/v1\/render\/image\/public\/';/);
    assert.match(app, /const THUMBNAIL_IMAGE_WIDTHS = \[480, 720, 960\];/);
    assert.match(app, /const THUMBNAIL_IMAGE_QUALITY = 84;/);
    assert.match(app, /url\.pathname = url\.pathname\.replace\(SUPABASE_STORAGE_OBJECT_PUBLIC_PATH, SUPABASE_STORAGE_RENDER_PUBLIC_PATH\);/);
    assert.match(app, /url\.searchParams\.set\('width', String\(width\)\);/);
    assert.match(app, /url\.searchParams\.set\('quality', String\(THUMBNAIL_IMAGE_QUALITY\)\);/);
    assert.match(app, /const src = getStorageImageVariantUrl\(fallbackSource, 720\) \|\| fallbackSource;/);
});

test('home and explore thumbnails render responsive image markup', () => {
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

test('overview thumbnails keep filled rounded frames', () => {
    const css = stylesheet();

    assert.match(css, /\.recent-photo-grid img\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*cover;[^}]*object-position:\s*center;/s);
    assert.match(css, /\.personal-photo-card img\s*\{[^}]*width:\s*100%;[^}]*aspect-ratio:\s*1;[^}]*object-fit:\s*cover;[^}]*object-position:\s*center;/s);
    assert.match(css, /\.explore-discovery-item img\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*cover;[^}]*object-position:\s*center;/s);
});
