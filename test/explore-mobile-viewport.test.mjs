import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    getExploreMapFitPadding,
    getExploreMapFocusPanY,
    getExploreMapPreviewFocusPanY
} from '../js/explore-mobile-viewport.mjs';

test('desktop Explore keeps its existing even map padding', () => {
    assert.equal(getExploreMapFitPadding({ isMobile: false }), 96);
});

test('open mobile photo list reserves the lower map and lifts pin focus upward', () => {
    const padding = getExploreMapFitPadding({
        isMobile: true,
        isDrawerOpen: true,
        viewportHeight: 780,
        drawerHeight: 440
    });

    assert.deepEqual(padding, { top: 72, right: 28, bottom: 464, left: 28 });
    assert.equal(getExploreMapFocusPanY(padding), 196);
});

test('closed mobile photo list uses compact even padding', () => {
    const padding = getExploreMapFitPadding({
        isMobile: true,
        isDrawerOpen: false,
        viewportHeight: 780
    });

    assert.deepEqual(padding, { top: 72, right: 28, bottom: 72, left: 28 });
    assert.equal(getExploreMapFocusPanY(padding), 0);
});

test('mobile photo preview lifts the selected pin above the bottom panel', () => {
    assert.equal(getExploreMapPreviewFocusPanY({
        isMobile: true,
        viewportHeight: 780,
        previewHeight: 440
    }), 196);
    assert.equal(getExploreMapPreviewFocusPanY({
        isMobile: false,
        viewportHeight: 780,
        previewHeight: 440
    }), 0);
});
