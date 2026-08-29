import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync('style.css', 'utf8');
const html = readFileSync('index.html', 'utf8');

function mobileBlock() {
    const start = css.indexOf('@media (max-width: 860px)');
    const end = css.indexOf('@media (max-height: 760px)', start);
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);
    return css.slice(start, end);
}

test('mobile Explore uses a map-first canvas with a bottom-sheet preview', () => {
    const mobile = mobileBlock();

    assert.match(mobile, /\.explore-map-canvas\s*\{[^}]*height:\s*calc\(100svh - 64px\);/s);
    assert.match(mobile, /\.map-search\s*\{[^}]*top:\s*12px;[^}]*left:\s*12px;[^}]*right:\s*auto;[^}]*width:\s*min\(228px,\s*calc\(100% - 24px\)\);/s);
    assert.match(mobile, /\.explore-discovery-panel\s*\{[^}]*display:\s*block;[^}]*top:\s*96px;[^}]*left:\s*12px;[^}]*right:\s*12px;[^}]*background:\s*transparent;/s);
    assert.match(mobile, /\.explore-map \.google-map-marker-image\s*\{[^}]*transform:\s*scale\(1\.14\);[^}]*transform-origin:\s*50% 100%;/s);
    assert.match(mobile, /\.explore-discovery-header,\s*\.explore-discovery-body\s*\{[^}]*display:\s*none;/s);
    assert.match(mobile, /\.explore-mobile-list-toggle\s*\{[^}]*display:\s*inline-flex;[^}]*bottom:\s*calc\(18px \+ env\(safe-area-inset-bottom\)\);/s);
    assert.match(mobile, /\.explore-discovery-panel\.is-mobile-open\s*\{[^}]*position:\s*fixed;[^}]*bottom:\s*0;[^}]*height:\s*min\(58svh,\s*520px\);/s);
    assert.match(mobile, /\.explore-discovery-panel\.is-mobile-open \.explore-discovery-header,\s*\.explore-discovery-panel\.is-mobile-open \.explore-discovery-body\s*\{[^}]*display:\s*grid;/s);
    assert.match(mobile, /\.explore-discovery-panel \.explore-photo-scope\s*\{[^}]*display:\s*none;/s);
    assert.match(mobile, /\.explore-discovery-panel\.is-mobile-open \.explore-photo-scope\s*\{[^}]*display:\s*flex;[^}]*pointer-events:\s*auto;/s);
    assert.match(mobile, /\.explore-pin-preview\s*\{[^}]*position:\s*fixed;[^}]*left:\s*12px;[^}]*right:\s*12px;[^}]*bottom:\s*calc\(12px \+ env\(safe-area-inset-bottom\)\);/s);
    assert.match(mobile, /\.explore-pin-preview\s*\{[^}]*display:\s*grid;[^}]*gap:\s*12px;[^}]*max-height:\s*min\(58svh,\s*520px\);/s);
    assert.match(mobile, /\.explore-pin-preview\s*\{[^}]*width:\s*auto;/s);
    assert.match(mobile, /\.explore-pin-preview\s*\{[^}]*border-radius:\s*10px;/s);
    assert.match(mobile, /\.explore-pin-preview\.is-expanded\s*\{[^}]*bottom:\s*0;[^}]*height:\s*100svh;[^}]*max-height:\s*100svh;[^}]*border-radius:\s*0;/s);
    assert.match(mobile, /\.explore-pin-preview\.is-expanded \.pin-preview-photo-button img\s*\{[^}]*height:\s*min\(50svh,\s*420px\);[^}]*object-fit:\s*contain;/s);
    assert.doesNotMatch(mobile, /\.pin-preview-nearby/);
    assert.match(mobile, /\.pin-preview-visibility\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s);
});

test('mobile Home keeps the legacy reference layout stable without restoring the private workspace', () => {
    const mobile = mobileBlock();

    assert.doesNotMatch(mobile, /body\.is-logged-in\s+\.home-workspace\s*\{/s);
    assert.doesNotMatch(mobile, /body\.is-logged-in\s+\.hero\s*\{/s);
    assert.doesNotMatch(mobile, /body\.is-logged-in\s+\.home-public-preview\s*\{/s);
    assert.match(mobile, /\.home-feature-stories\s*\{[^}]*width:\s*100%;[^}]*gap:\s*0;[^}]*margin-bottom:\s*0;[^}]*padding-left:\s*16px;[^}]*padding-right:\s*16px;/s);
    assert.match(mobile, /\.home-feature-story\s*\{[^}]*grid-template-columns:\s*1fr;[^}]*gap:\s*22px;[^}]*padding:\s*48px 0;/s);
    assert.match(mobile, /\.home-feature-story__media\s*\{[^}]*aspect-ratio:\s*auto;[^}]*border-radius:\s*0;/s);
    assert.match(mobile, /\.home-feature-story__media img\s*\{[^}]*padding:\s*0;/s);
    assert.match(mobile, /\.home-feature-story__copy h3\s*\{[^}]*font-size:\s*28px;[^}]*line-height:\s*1\.18;/s);
    assert.match(mobile, /\.home-feature-story__actions\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*1fr;[^}]*width:\s*100%;/s);
    assert.match(mobile, /\.home-houses-reference\s*\{[^}]*padding-left:\s*16px;[^}]*padding-right:\s*16px;[^}]*padding-top:\s*84px;[^}]*padding-bottom:\s*68px;/s);
    assert.match(mobile, /\.home-houses-reference__word\s*\{[^}]*font-size:\s*clamp\(150px,\s*42vw,\s*280px\);/s);
    assert.match(mobile, /\.home-houses-reference__content\s*\{[^}]*padding-top:\s*138px;/s);
    assert.match(mobile, /\.home-houses-reference__copy\s*\{[^}]*font-size:\s*17px;[^}]*line-height:\s*1\.52;/s);
    assert.match(mobile, /\.home-houses-reference__collage\s*\{[^}]*height:\s*380px;[^}]*margin-top:\s*44px;/s);
    assert.doesNotMatch(mobile, /\.home-houses-reference__collage::before\s*\{/);
    assert.doesNotMatch(mobile, /\.home-houses-reference__mapline\s*\{/);
    assert.match(mobile, /\.home-houses-reference__photo figcaption\s*\{[^}]*font-size:\s*11px;[^}]*padding:\s*6px 8px;/s);
    assert.doesNotMatch(mobile, /\.home-houses-reference__divider\s*\{/);
    assert.match(mobile, /\.home-section-divider\s*\{[^}]*height:\s*104px;[^}]*margin-top:\s*0;[^}]*margin-bottom:\s*-16px;/s);
    assert.match(mobile, /\.site-footer\s*\{[^}]*padding:\s*38px 16px calc\(34px \+ env\(safe-area-inset-bottom\)\);/s);
});

test('mobile app shell uses a compact header without fixed bottom navigation', () => {
    const mobile = mobileBlock();

    assert.doesNotMatch(html, /class="mobile-bottom-nav"/);
    assert.doesNotMatch(css, /\.mobile-bottom-nav\s*\{/);
    assert.match(mobile, /body\s*\{[^}]*padding-bottom:\s*0;/s);
    assert.match(mobile, /\.site-header-inner\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto;/s);
    assert.doesNotMatch(html, /class="top-nav"/);
});

test('mobile album and photo detail views avoid side-by-side desktop layouts', () => {
    const mobile = mobileBlock();

    assert.match(mobile, /\.trip-review-layout\s*\{[^}]*grid-template-columns:\s*1fr;/s);
    assert.match(mobile, /\.trip-review-map-panel\s*\{[^}]*position:\s*relative;[^}]*order:\s*-1;/s);
    assert.match(mobile, /\.trip-review-photo-row\s*\{[^}]*height:\s*156px;/s);
    assert.match(mobile, /\.photo-detail-card\s*\{[^}]*display:\s*block;[^}]*width:\s*100vw;[^}]*height:\s*100svh;[^}]*max-height:\s*100svh;[^}]*overflow-y:\s*auto;/s);
    assert.match(mobile, /\.photo-detail-media-column\s*\{[^}]*height:\s*auto;[^}]*max-height:\s*none;[^}]*overflow:\s*visible;/s);
    assert.match(mobile, /\.photo-detail-media-column > img\s*\{[^}]*height:\s*auto;[^}]*max-height:\s*70svh;[^}]*object-fit:\s*contain;/s);
    assert.match(mobile, /\.photo-detail-card section\s*\{[^}]*display:\s*grid;[^}]*gap:\s*12px;[^}]*height:\s*auto;[^}]*overflow:\s*visible;/s);
    assert.match(mobile, /\.photo-detail-section-head\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;[^}]*justify-content:\s*flex-end;/s);
    assert.match(mobile, /\.photo-detail-more-button,\s*\.photo-detail-close\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/s);
    assert.match(mobile, /\.photo-detail-close\s*\{[^}]*position:\s*static;[^}]*flex:\s*0 0 44px;/s);
    assert.match(mobile, /\.modal\.photo-detail-modal\s*\{[^}]*align-items:\s*stretch;[^}]*padding:\s*0;/s);
    assert.match(mobile, /\.photo-detail-meta > span,\s*\.photo-detail-meta > a,\s*\.photo-detail-visibility,\s*\.photo-detail-like-panel\s*\{[^}]*width:\s*100%;/s);
    assert.doesNotMatch(mobile, /\.photo-detail-nearby/);
    assert.match(mobile, /\.photo-fullscreen-modal\s*\{[^}]*align-items:\s*stretch;[^}]*padding:\s*0;/s);
    assert.match(mobile, /\.photo-fullscreen-card\s*\{[^}]*width:\s*100vw;[^}]*height:\s*100svh;/s);
});

test('mobile upload, album, trip, and personal photo surfaces keep thumb grids usable', () => {
    const mobile = mobileBlock();

    assert.match(mobile, /body\[data-page="upload"\]\s+\.page-container,[\s\S]*body\[data-page="profile"\]\s+\.page-container\s*\{[^}]*width:\s*100%;[^}]*padding-left:\s*16px;[^}]*padding-right:\s*16px;/s);
    assert.match(mobile, /\.upload-dropzone\s*\{[^}]*min-height:\s*260px;/s);
    assert.match(mobile, /\.upload-thumbnail-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s);
    assert.match(mobile, /\.upload-result-panel\s*\{[^}]*gap:\s*14px;[^}]*margin-top:\s*18px;[^}]*padding:\s*16px;/s);
    assert.match(mobile, /\.upload-review-list\s*\{[^}]*max-height:\s*42svh;[^}]*overflow-y:\s*auto;/s);
    assert.match(mobile, /\.upload-result-panel \.result-actions\s*\{[^}]*position:\s*sticky;[^}]*bottom:\s*0;/s);
    assert.match(mobile, /\.recent-photo-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s);
    assert.match(mobile, /\.personal-photo-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s);
    assert.match(mobile, /\.photo-select-button\s*\{[^}]*width:\s*30px;[^}]*height:\s*30px;[^}]*opacity:\s*1;[^}]*transform:\s*scale\(1\);/s);
    assert.match(mobile, /\.album-photo-picker-grid,\s*\.public-trip-photo-grid,\s*\.profile-album-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s);
    assert.match(mobile, /\.profile-photo-grid\s*\{[^}]*column-count:\s*2;[^}]*column-gap:\s*12px;/s);
    assert.match(mobile, /\.album-compose-map\s*\{[^}]*order:\s*-1;/s);
    assert.match(mobile, /\.public-trip-hero\s*\{[^}]*min-height:\s*420px;/s);
    assert.match(mobile, /\.profile-tabs\s*\{[^}]*overflow-x:\s*auto;/s);
    assert.match(mobile, /\.attention-banner\s*\{[^}]*grid-template-columns:\s*1fr;/s);
    assert.match(mobile, /\.trip-actions\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*1fr;/s);
    assert.match(mobile, /\.profile-title-row h1\s*\{[^}]*font-size:\s*30px;[^}]*overflow-wrap:\s*anywhere;/s);
    assert.match(mobile, /\.profile-edit-photo-field\s*\{[^}]*grid-template-columns:\s*1fr;/s);
    assert.match(mobile, /\.map-pick-button\s*\{[^}]*left:\s*12px;[^}]*right:\s*12px;[^}]*width:\s*auto;/s);
    assert.match(mobile, /\.photo-visibility-editor > div,\s*\.location-form\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*1fr;/s);
});

test('DESIGN documents the mobile web shell strategy', () => {
    const design = readFileSync('DESIGN.md', 'utf8');

    assert.match(design, /### Mobile Web Shell/);
    assert.match(design, /compact brand\/account bar/);
    assert.match(design, /Mobile Explore stays map-first/);
    assert.match(design, /Photo detail and fullscreen viewers remain full-screen/);
    assert.match(design, /Mobile editing controls stay visible without hover/);
});

test('mobile modals become bottom sheets except dedicated photo viewers', () => {
    const mobile = mobileBlock();

    assert.match(mobile, /\.modal\s*\{[^}]*align-items:\s*flex-end;[^}]*padding:\s*12px;/s);
    assert.match(mobile, /\.modal-card,\s*\.account-profile-modal-card\s*\{[^}]*width:\s*100%;[^}]*max-height:\s*calc\(100svh - 24px\);[^}]*border-radius:\s*18px 18px 0 0;/s);
    assert.match(mobile, /\.photo-detail-modal\s*\{[^}]*align-items:\s*stretch;[^}]*padding:\s*0;/s);
    assert.match(mobile, /\.photo-fullscreen-modal\s*\{[^}]*align-items:\s*stretch;[^}]*padding:\s*0;/s);
});
