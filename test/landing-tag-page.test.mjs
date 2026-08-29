import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    buildLandingTagHash,
    canOpenLandingTagPage,
    parseLandingTagId
} from '../js/landing-tag-route.mjs';

const appSource = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

test('landing tag routes preserve the selected section in a refreshable hash', () => {
    assert.equal(buildLandingTagHash('korea'), '#/tag?section=korea');
    assert.equal(buildLandingTagHash('city night'), '#/tag?section=city%20night');
    assert.equal(buildLandingTagHash(''), '#/landing');
    assert.equal(parseLandingTagId('#/tag?section=city%20night'), 'city night');
    assert.equal(parseLandingTagId('#/landing?section=korea'), null);
});

test('view all is available for topic sections but not the recommendation section', () => {
    assert.equal(canOpenLandingTagPage({ id: 'recommended' }), false);
    assert.equal(canOpenLandingTagPage({ id: 'section-uuid', title: '추천' }), false);
    assert.equal(canOpenLandingTagPage({ id: 'search-results' }), false);
    assert.equal(canOpenLandingTagPage({ id: 'korea' }), true);
    assert.equal(canOpenLandingTagPage({ id: 'landscape' }), true);
});

test('landing topic headings expose a right-side view-all action', () => {
    assert.match(appSource, /canOpenLandingTagPage\(section\)/);
    assert.match(appSource, /data-landing-view-all="\$\{escapeHtml\(section\.id\)\}"/);
    assert.match(appSource, />\s*전체보기\s*</);
    assert.match(appSource, /routeToLandingTag\(landingViewAllButton\.dataset\.landingViewAll\)/);
    assert.match(cssSource, /\.landing-section-view-all\s*\{[\s\S]*position:\s*absolute;[\s\S]*right:\s*104px;/);
    assert.match(cssSource, /@media \(max-width:\s*760px\)[\s\S]*\.landing-section-view-all\s*\{[\s\S]*right:\s*0;/s);
});

test('landing topic page is a map-free regional gallery with thirty desktop photos per page', () => {
    const pageStart = appSource.indexOf('function renderLandingTagPage');
    const pageEnd = appSource.indexOf('function renderTripReviewStoryBlock', pageStart);
    const pageSource = appSource.slice(pageStart, pageEnd);
    assert.match(appSource, /function renderLandingTagPage\(\)/);
    assert.match(appSource, /getLandingTagFeedPhotos\(section, getLandingPublicPhotos\(\), getLandingTagSessionSeed\(section\.id\)\)/);
    assert.match(pageSource, /getLandingTagRegions\(sectionPhotos\)/);
    assert.match(pageSource, /filterLandingTagPhotosByRegion\(sectionPhotos, state\.landingTagRegion\)/);
    assert.match(pageSource, /getLandingTagPhotoPage\(regionPhotos, state\.landingTagPage\)/);
    assert.match(pageSource, /class="landing-tag-gallery-grid"/);
    assert.match(pageSource, /class="landing-tag-gallery-card" data-landing-photo-id=/);
    assert.match(pageSource, /data-landing-tag-region/);
    assert.match(pageSource, /data-landing-tag-page="previous"/);
    assert.match(pageSource, /data-landing-tag-page="next"/);
    assert.doesNotMatch(pageSource, /trip-review-map|renderTripReviewMap|IntersectionObserver|landing-tag-load-sentinel/);
    assert.match(appSource, /function renderPublicSurfaces\(\)\s*\{\s*if \(document\.body\.dataset\.page === 'tag'\)\s*\{\s*renderLandingTagPage\(\);\s*return;/s);
    assert.match(cssSource, /\.landing-tag-gallery-shell\s*\{[^}]*width:\s*min\(var\(--container\),\s*calc\(100% - 48px\)\);/s);
    assert.match(cssSource, /\.landing-tag-gallery-grid\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\);[^}]*gap:\s*18px;/s);
    assert.match(cssSource, /\.landing-tag-gallery-card\s*\{[^}]*aspect-ratio:\s*4 \/ 5;/s);
    assert.match(cssSource, /@media \(max-width:\s*760px\)[\s\S]*\.landing-tag-gallery-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[^}]*gap:\s*10px;/s);
});

test('landing admin limits the manually ordered tag lead to twenty photos', () => {
    assert.match(appSource, /\(section\.photo_ids \|\| \[\]\)\.slice\(0, LANDING_TAG_PIN_LIMIT\)/);
    assert.match(appSource, /상단 고정 사진 \(최대 20장\)/);
    assert.match(appSource, /section\.photo_ids\.length >= LANDING_TAG_PIN_LIMIT/);
});

test('a refreshed landing tag route waits for remote curation before validating its section', () => {
    assert.match(appSource, /hasLoadedLandingCuration:\s*false/);
    assert.match(appSource, /state\.hasLoadedLandingCuration = true/);
    assert.match(appSource, /if \(getCurrentRoute\(\) === 'tag'\) renderLandingTagPage\(\)/);
    assert.match(appSource, /if \(!state\.hasLoadedLandingCuration\)\s*\{[\s\S]*renderLandingTagLoadingPage\(\);[\s\S]*return;/);
});
