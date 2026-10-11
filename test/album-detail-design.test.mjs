import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync('style.css', 'utf8');
const app = readFileSync('js/app.js', 'utf8');

test('album header is compact and readable without viewport-scaled display type', () => {
    assert.match(css, /\.trip-review-title-block h1\s*\{[^}]*font-size: 48px;/s);
    assert.match(css, /\.trip-review-title-block h1\s*\{[^}]*overflow-wrap: anywhere;/s);
    assert.match(css, /\.trip-review-header\.is-untitled[^}]*\{[^}]*padding-bottom: 24px;/s);
    assert.match(css, /\.trip-review-title-block h1\.is-untitled\s*\{[^}]*clip-path: inset\(50%\);/s);
});

test('album photo grid shrinks within its own column instead of overflowing under the map', () => {
    for (const selector of ['trip-review-photo-flow', 'trip-review-day', 'trip-review-day-rows', 'trip-review-photo-row']) {
        assert.match(css, new RegExp(`\\.${selector}\\s*\\{[^}]*min-width: 0;`, 's'));
    }
});

test('album description is shown only when supplied and back navigation uses Korean labels', () => {
    assert.match(app, /tripReviewDescription\.hidden = !getAlbumVisibleNote\(selected\)/);
    assert.match(app, /reviewBackLabel\.textContent = isOwnAlbum \? '홈' : '지도'/);
    assert.match(css, /\.trip-review-title-block > p\s*\{[^}]*max-width: 640px;/s);
});
