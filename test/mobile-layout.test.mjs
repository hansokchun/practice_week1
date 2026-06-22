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

    assert.match(mobile, /\.explore-map-canvas\s*\{[^}]*height:\s*calc\(100svh - 64px - 82px\);/s);
    assert.match(mobile, /\.explore-pin-preview\s*\{[^}]*position:\s*fixed;[^}]*left:\s*12px;[^}]*right:\s*12px;[^}]*bottom:\s*92px;/s);
    assert.match(mobile, /\.explore-pin-preview\s*\{[^}]*width:\s*auto;/s);
    assert.match(mobile, /\.explore-pin-preview\.is-expanded\s*\{[^}]*max-height:\s*calc\(100svh - 120px\);/s);
});

test('mobile Home keeps the private workspace visible without logged-in intro sections', () => {
    const mobile = mobileBlock();

    assert.match(mobile, /body\.is-logged-in\s+\.home-workspace\s*\{[^}]*padding-top:\s*24px;/s);
    assert.doesNotMatch(mobile, /body\.is-logged-in\s+\.hero\s*\{/s);
    assert.doesNotMatch(mobile, /body\.is-logged-in\s+\.home-public-preview\s*\{/s);
    assert.match(mobile, /\.home-explore-guide\s*\{[^}]*grid-template-columns:\s*1fr;/s);
    assert.match(mobile, /\.home-explore-guide-media img\s*\{[^}]*aspect-ratio:\s*1\.28;/s);
    assert.match(mobile, /\.editorial-feature\s*\{[^}]*width:\s*calc\(100% - 32px\);/s);
    assert.match(mobile, /\.editorial-feature__hero,[\s\S]*\.editorial-feature__hero-row,[\s\S]*\.editorial-feature__intro\s*\{[^}]*grid-template-columns:\s*1fr;/s);
    assert.match(mobile, /\.editorial-feature--korean\s+\.editorial-feature__inner\s*\{[^}]*width:\s*1360px;[^}]*min-width:\s*1360px;/s);
    assert.match(mobile, /\.editorial-feature--korean\s+\.editorial-feature__side-image\s*\{[^}]*position:\s*absolute;[^}]*top:\s*62px;[^}]*right:\s*0;[^}]*width:\s*232px;/s);
    assert.match(mobile, /\.editorial-feature--korean\s+\.editorial-feature__headline\s*\{[^}]*font-size:\s*212px;[^}]*white-space:\s*nowrap;/s);
    assert.match(mobile, /\.editorial-feature--korean\s+\.editorial-feature__statement\s*\{[^}]*font-size:\s*156px;[^}]*white-space:\s*nowrap;/s);
    assert.match(mobile, /\.hero h1\s*\{[^}]*font-size:\s*34px;/s);
});

test('mobile album and photo detail views avoid side-by-side desktop layouts', () => {
    const mobile = mobileBlock();

    assert.match(mobile, /\.trip-review-layout\s*\{[^}]*grid-template-columns:\s*1fr;/s);
    assert.match(mobile, /\.trip-review-map-panel\s*\{[^}]*position:\s*relative;[^}]*order:\s*-1;/s);
    assert.match(mobile, /\.trip-review-photo-row\s*\{[^}]*height:\s*156px;/s);
    assert.match(mobile, /\.photo-detail-card\s*\{[^}]*width:\s*100vw;[^}]*max-height:\s*100svh;[^}]*border-radius:\s*0;/s);
    assert.match(mobile, /\.photo-detail-card > img\s*\{[^}]*max-height:\s*62svh;/s);
    assert.match(mobile, /\.photo-detail-card section\s*\{[^}]*max-height:\s*38svh;/s);
});

test('mobile upload and personal photo surfaces keep thumb grids usable', () => {
    const mobile = mobileBlock();

    assert.match(mobile, /\.upload-dropzone\s*\{[^}]*min-height:\s*260px;/s);
    assert.match(mobile, /\.upload-thumbnail-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s);
    assert.match(mobile, /\.recent-photo-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s);
    assert.match(mobile, /\.personal-photo-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s);
    assert.match(mobile, /\.attention-banner\s*\{[^}]*grid-template-columns:\s*1fr;/s);
});
