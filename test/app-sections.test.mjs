import test from 'node:test';
import assert from 'node:assert/strict';

import {
    APP_SECTIONS,
    getSectionForViewMode,
    getViewModeForSection,
    normalizeAppSection,
    parseSectionHash,
    sectionToHash
} from '../js/app-sections.mjs';

test('normalizeAppSection accepts only top-level product sections', () => {
    assert.equal(normalizeAppSection('home'), APP_SECTIONS.HOME);
    assert.equal(normalizeAppSection('myphoto'), APP_SECTIONS.MYPHOTO);
    assert.equal(normalizeAppSection('explore'), APP_SECTIONS.EXPLORE);
    assert.equal(normalizeAppSection('unknown'), APP_SECTIONS.HOME);
    assert.equal(normalizeAppSection(null), APP_SECTIONS.HOME);
});

test('sectionToHash creates route-like hash values', () => {
    assert.equal(sectionToHash(APP_SECTIONS.HOME), '#/');
    assert.equal(sectionToHash(APP_SECTIONS.MYPHOTO), '#/myphoto');
    assert.equal(sectionToHash(APP_SECTIONS.EXPLORE), '#/explore');
});

test('parseSectionHash handles route-like hashes and legacy photo hashes', () => {
    assert.equal(parseSectionHash('#/'), APP_SECTIONS.HOME);
    assert.equal(parseSectionHash('#/myphoto'), APP_SECTIONS.MYPHOTO);
    assert.equal(parseSectionHash('#/explore?photoId=123'), APP_SECTIONS.EXPLORE);
    assert.equal(parseSectionHash('#1234567890'), null);
    assert.equal(parseSectionHash(''), null);
});

test('viewMode compatibility maps current renderer modes to product sections', () => {
    assert.equal(getSectionForViewMode('my'), APP_SECTIONS.MYPHOTO);
    assert.equal(getSectionForViewMode('shared'), APP_SECTIONS.EXPLORE);
    assert.equal(getViewModeForSection(APP_SECTIONS.MYPHOTO), 'my');
    assert.equal(getViewModeForSection(APP_SECTIONS.EXPLORE), 'shared');
    assert.equal(getViewModeForSection(APP_SECTIONS.HOME), 'my');
});
