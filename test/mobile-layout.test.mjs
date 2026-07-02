import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync('style.css', 'utf8');

function mobileBlock() {
    const start = css.indexOf('@media (max-width: 860px)');
    const end = css.indexOf('@media (max-height: 760px)', start);
    assert.notEqual(start, -1);
    assert.notEqual(end, -1);
    return css.slice(start, end);
}

test('mobile Explore uses a map-first canvas with a bottom-sheet preview', () => {
    const mobile = mobileBlock();

    assert.match(mobile, /\.explore-map-canvas\s*\{[^}]*height:\s*calc\(100svh - 64px - 92px\);/s);
    assert.match(mobile, /\.map-search\s*\{[^}]*top:\s*12px;[^}]*left:\s*12px;[^}]*right:\s*12px;[^}]*width:\s*auto;/s);
    assert.match(mobile, /\.explore-discovery-panel\s*\{[^}]*display:\s*block;[^}]*top:\s*66px;[^}]*left:\s*12px;[^}]*right:\s*12px;[^}]*background:\s*transparent;/s);
    assert.match(mobile, /\.explore-discovery-header,\s*\.explore-discovery-body\s*\{[^}]*display:\s*none;/s);
    assert.match(mobile, /\.explore-discovery-panel \.explore-photo-scope\s*\{[^}]*pointer-events:\s*auto;/s);
    assert.match(mobile, /\.explore-pin-preview\s*\{[^}]*position:\s*fixed;[^}]*left:\s*12px;[^}]*right:\s*12px;[^}]*bottom:\s*92px;/s);
    assert.match(mobile, /\.explore-pin-preview\s*\{[^}]*width:\s*auto;/s);
    assert.match(mobile, /\.explore-pin-preview\s*\{[^}]*border-radius:\s*10px;/s);
    assert.match(mobile, /\.explore-pin-preview\.is-expanded\s*\{[^}]*max-height:\s*calc\(100svh - 120px\);/s);
});

test('mobile Home keeps the private workspace and bottom reference visible while hiding top logged-in promos', () => {
    const mobile = mobileBlock();

    assert.match(mobile, /body\.is-logged-in\s+\.home-workspace\s*\{[^}]*padding-top:\s*24px;/s);
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
    assert.match(mobile, /\.site-footer\s*\{[^}]*padding:\s*38px 16px calc\(34px \+ 92px\);/s);
});

test('mobile app shell uses a compact header and two-item bottom navigation', () => {
    const mobile = mobileBlock();

    assert.match(css, /\.mobile-bottom-nav\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s);
    assert.match(css, /\.mobile-bottom-nav\s*\{[^}]*padding:\s*10px 16px calc\(12px \+ env\(safe-area-inset-bottom\)\);/s);
    assert.match(css, /\.mobile-bottom-nav button\.active\s*\{[^}]*background:\s*var\(--teal-dark\);[^}]*color:\s*#ffffff;/s);
    assert.match(mobile, /body\s*\{[^}]*padding-bottom:\s*calc\(92px \+ env\(safe-area-inset-bottom\)\);/s);
    assert.match(mobile, /\.site-header-inner\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto;/s);
    assert.match(mobile, /\.top-nav\s*\{[^}]*display:\s*none;/s);
});

test('mobile album and photo detail views avoid side-by-side desktop layouts', () => {
    const mobile = mobileBlock();

    assert.match(mobile, /\.trip-review-layout\s*\{[^}]*grid-template-columns:\s*1fr;/s);
    assert.match(mobile, /\.trip-review-map-panel\s*\{[^}]*position:\s*relative;[^}]*order:\s*-1;/s);
    assert.match(mobile, /\.trip-review-photo-row\s*\{[^}]*height:\s*156px;/s);
    assert.match(mobile, /\.photo-detail-card\s*\{[^}]*width:\s*100vw;[^}]*height:\s*100svh;[^}]*max-height:\s*100svh;[^}]*border-radius:\s*0;/s);
    assert.match(mobile, /\.photo-detail-card > img\s*\{[^}]*height:\s*52svh;[^}]*max-height:\s*52svh;[^}]*object-fit:\s*contain;/s);
    assert.match(mobile, /\.photo-detail-card section\s*\{[^}]*height:\s*48svh;[^}]*overflow-y:\s*auto;/s);
    assert.match(mobile, /\.photo-fullscreen-modal\s*\{[^}]*align-items:\s*stretch;[^}]*padding:\s*0;/s);
    assert.match(mobile, /\.photo-fullscreen-card\s*\{[^}]*width:\s*100vw;[^}]*height:\s*100svh;/s);
});

test('mobile upload, album, trip, and personal photo surfaces keep thumb grids usable', () => {
    const mobile = mobileBlock();

    assert.match(mobile, /body\[data-page="upload"\]\s+\.page-container,[\s\S]*body\[data-page="profile"\]\s+\.page-container\s*\{[^}]*width:\s*100%;[^}]*padding-left:\s*16px;[^}]*padding-right:\s*16px;/s);
    assert.match(mobile, /\.upload-dropzone\s*\{[^}]*min-height:\s*260px;/s);
    assert.match(mobile, /\.upload-thumbnail-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s);
    assert.match(mobile, /\.recent-photo-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s);
    assert.match(mobile, /\.personal-photo-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s);
    assert.match(mobile, /\.album-photo-picker-grid,\s*\.public-trip-photo-grid,\s*\.profile-album-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s);
    assert.match(mobile, /\.profile-photo-grid\s*\{[^}]*column-count:\s*2;[^}]*column-gap:\s*12px;/s);
    assert.match(mobile, /\.album-compose-map\s*\{[^}]*order:\s*-1;/s);
    assert.match(mobile, /\.public-trip-hero\s*\{[^}]*min-height:\s*420px;/s);
    assert.match(mobile, /\.profile-tabs\s*\{[^}]*overflow-x:\s*auto;/s);
    assert.match(mobile, /\.attention-banner\s*\{[^}]*grid-template-columns:\s*1fr;/s);
    assert.match(mobile, /\.trip-actions\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*1fr;/s);
    assert.match(mobile, /\.profile-title-row h1\s*\{[^}]*font-size:\s*30px;[^}]*overflow-wrap:\s*anywhere;/s);
});

test('DESIGN documents the mobile web shell strategy', () => {
    const design = readFileSync('DESIGN.md', 'utf8');

    assert.match(design, /### Mobile Web Shell/);
    assert.match(design, /compact brand\/account bar/);
    assert.match(design, /Mobile Explore stays map-first/);
    assert.match(design, /Photo detail and fullscreen viewers remain full-screen/);
});

test('mobile modals become bottom sheets except dedicated photo viewers', () => {
    const mobile = mobileBlock();

    assert.match(mobile, /\.modal\s*\{[^}]*align-items:\s*flex-end;[^}]*padding:\s*12px;/s);
    assert.match(mobile, /\.modal-card,\s*\.account-profile-modal-card\s*\{[^}]*width:\s*100%;[^}]*max-height:\s*calc\(100svh - 24px\);[^}]*border-radius:\s*18px 18px 0 0;/s);
    assert.match(mobile, /\.photo-detail-modal\s*\{[^}]*align-items:\s*stretch;[^}]*padding:\s*0;/s);
    assert.match(mobile, /\.photo-fullscreen-modal\s*\{[^}]*align-items:\s*stretch;[^}]*padding:\s*0;/s);
});
