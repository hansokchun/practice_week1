import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

function renderAlbumState(overrides = {}) {
    const page = { innerHTML: '' };
    const state = {
        hasLoadedSavedPhotos: false, hasLoadedSavedAlbums: false,
        savedPhotosLoadError: false, savedAlbumsLoadError: false,
        ...overrides
    };
    const context = {
        state, document: { body: { dataset: { page: 'trip' } } }, navigator: { onLine: true },
        APP_SECTIONS: { EXPLORE: 'explore' }, $: selector => selector === '#page-trip' ? page : null,
        escapeHtml: String, ensureProfileHeaderShell() {}, renderExplorePhotoScopeControls() {},
        getPublicSurfaceAlbums: () => [], getSavedPublicAlbums: () => [], getPublicDemoAlbumEntries: () => [],
        getPublicPhotoMapItems: () => [], getExplorePhotoMapItems: () => [], getSelectedPublicAlbum: () => null,
        getLibraryFailureState: () => ({ title: '불러오지 못했습니다', body: '다시 시도해주세요' }),
        renderActionableFailure: () => '<button data-retry-saved-library>다시 시도</button>',
        renderEmptyPublicSurfaces: () => { page.innerHTML = '공개된 여행이 없습니다'; }
    };
    const statusStart = app.indexOf('function renderTripReviewStatus(');
    const status = statusStart < 0 ? '' : app.slice(statusStart, app.indexOf('function renderTripReviewShell(', statusStart));
    const render = app.slice(app.indexOf('function renderPublicSurfaces('), app.indexOf('function getPhotoThumbnailStoragePathForUpload('));
    runInNewContext(`${status}\n${render}\nrenderPublicSurfaces();`, context);
    return page.innerHTML;
}

test('album entry waits for both photo and album metadata instead of flashing the public empty shell', () => {
    for (const flags of [{}, { hasLoadedSavedPhotos: true }, { hasLoadedSavedAlbums: true }]) {
        const html = renderAlbumState(flags);
        assert.match(html, /앨범을 불러오는 중입니다/);
        assert.match(html, /aria-busy="true"/);
        assert.doesNotMatch(html, /공개된 여행이 없습니다|PUBLIC TRIP|<img/);
    }
});

test('a truly empty album is shown only after metadata loading has finished', () => {
    const html = renderAlbumState({ hasLoadedSavedPhotos: true, hasLoadedSavedAlbums: true });
    assert.match(html, /앨범이 없습니다/);
    assert.doesNotMatch(html, /불러오는 중|PUBLIC TRIP|공개된 여행이 없습니다/);
});

test('failed album metadata offers a retry instead of claiming there are no albums', () => {
    for (const failure of ['savedAlbumsLoadError', 'savedPhotosLoadError']) {
        const html = renderAlbumState({ hasLoadedSavedPhotos: true, hasLoadedSavedAlbums: true, [failure]: true });
        assert.match(html, /data-retry-saved-library/);
        assert.doesNotMatch(html, /앨범이 없습니다|공개된 여행이 없습니다/);
    }
});

test('metadata retry resets the visible album detail to a loading state', () => {
    const retry = app.slice(app.indexOf('async function retrySavedLibrary('), app.indexOf('async function loadPublicProfileNames('));
    assert.match(retry, /document\.body\.dataset\.page === 'trip'[\s\S]*renderPublicSurfaces\(\)/);
});

test('album status screens use compact headings instead of the full album hero typography', () => {
    assert.match(renderAlbumState(), /trip-review-shell trip-review-state/);
    assert.match(css, /\.trip-review-state \.trip-review-title-block h1\s*\{[^}]*font-size:\s*28px;/s);
});
