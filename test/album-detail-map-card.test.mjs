import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

test('album detail date dividers do not show per-day photo counts', () => {
    assert.doesNotMatch(appSource, /formatPhotoCount\(section\.photoCount\)/);
});

test('album detail uses a compact map card beside the photo timeline', () => {
    assert.match(appSource, /trip-review-map-summary/);
    assert.match(cssSource, /\.trip-review-map-panel\s*\{[\s\S]*border-radius: 20px/);
    assert.match(cssSource, /\.trip-review-map\s*\{[\s\S]*height: 390px/);
    assert.match(cssSource, /\.trip-review-map-panel\s*\{[\s\S]*margin-top: 30px/);
    assert.match(cssSource, /\.trip-review-layout\s*\{[\s\S]*gap: 36px/);
});

test('album detail exposes date map filters and a clear state', () => {
    assert.match(appSource, /data-trip-review-date/);
    assert.match(appSource, /data-clear-trip-review-date/);
    assert.match(appSource, /tripReviewDateFilter/);
});
