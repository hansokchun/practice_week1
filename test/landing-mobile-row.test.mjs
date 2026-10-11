import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as landing from '../js/landing-sections.mjs';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const start = source.indexOf('function centerLandingRowsOnMobile()');
const end = source.indexOf('async function loadLandingCuration', start);

function makeRow(width = 390, cards = 3) {
    return {
        clientWidth: width,
        scrollWidth: 720,
        scrollLeft: 0,
        dataset: {},
        style: { scrollBehavior: '' },
        querySelectorAll: () => Array.from({ length: cards }, (_, index) => ({
            offsetLeft: 78 + index * 246,
            clientWidth: 234
        }))
    };
}

function center(rows, { mobile = true } = {}) {
    const fn = runInNewContext(`${source.slice(start, end)}; centerLandingRowsOnMobile`, {
        window: { matchMedia: () => ({ matches: mobile }) },
        requestAnimationFrame: callback => callback(),
        $$: () => rows,
        getLandingRowInitialScroll: landing.getLandingRowInitialScroll,
        updateLandingScrollButtons() {}
    });
    fn();
}

test('mobile row geometry centers the target and waits for measurable layout', () => {
    assert.equal(typeof landing.getLandingRowInitialScroll, 'function');
    const getScroll = landing.getLandingRowInitialScroll;
    assert.equal(getScroll({ clientWidth: 390, scrollWidth: 720, cardOffset: 324, cardWidth: 234 }), 246);
    assert.equal(getScroll({ clientWidth: 0, scrollWidth: 0, cardOffset: 0, cardWidth: 0 }), null);
    assert.equal(getScroll({ clientWidth: 390, scrollWidth: 720, cardOffset: 78, cardWidth: 234 }), 0);
    assert.equal(getScroll({ clientWidth: 390, scrollWidth: 450, cardOffset: 324, cardWidth: 234 }), 60);
});

test('hidden home rows wait until route entry before applying their initial position', () => {
    const row = makeRow(0);
    center([row]);
    assert.equal(row.dataset.landingMobileCentered, undefined);
    row.clientWidth = 390;
    center([row]);
    assert.equal(row.scrollLeft, 246);
    assert.equal(row.dataset.landingMobileCentered, '1');
});

test('two-photo rows also start on the second photo without resetting manual swipes', () => {
    const row = makeRow(390, 2);
    center([row]);
    assert.equal(row.scrollLeft, 246);
    assert.equal(row.style.scrollBehavior, '');
    row.scrollLeft = 70;
    center([row]);
    assert.equal(row.scrollLeft, 70);
});

test('single-photo and empty rows remain safe; desktop returns to the first card', () => {
    const one = makeRow(390, 1);
    const empty = makeRow(390, 0);
    center([one, empty]);
    assert.equal(one.scrollLeft, 0);
    assert.equal(empty.dataset.landingMobileCentered, undefined);
    const row = makeRow();
    center([row]);
    center([row], { mobile: false });
    assert.equal(row.scrollLeft, 0);
    assert.equal(row.dataset.landingMobileCentered, undefined);
});

test('cached markup and viewport changes retry pending row alignment', () => {
    assert.match(source, /if \(lastLandingSectionsMarkup === sectionsMarkup\) \{\s*centerLandingRowsOnMobile\(\);\s*return;/);
    assert.match(source, /window\.addEventListener\('resize', \(\) => \{[^}]*centerLandingRowsOnMobile\(\);/s);
    assert.match(source.slice(start, end), /scrollBehavior = 'auto'/);
});

test('mobile rows bleed to screen edges while headings retain their inset', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 760px) {', css.indexOf('.landing-sections.page-container')));
    const row = mobile.match(/\.landing-photo-row\s*\{([^}]*)\}/)?.[1] ?? '';
    assert.match(row, /width:\s*calc\(100% \+ 32px\);/);
    assert.match(row, /margin-inline:\s*-16px;/);
    assert.match(row, /--landing-mobile-card-width:\s*60vw;/);
    assert.match(row, /padding-left:\s*calc\(\(100vw - var\(--landing-mobile-card-width\)\) \/ 2\);/);
    assert.match(mobile, /\.landing-section-heading h2\s*\{[^}]*font-size:\s*24px;/s);
});
