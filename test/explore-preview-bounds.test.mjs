import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('expanded Explore photo panel is capped within the visible viewport', () => {
    const css = readFileSync('style.css', 'utf8');

    assert.match(css, /\.explore-pin-preview\.is-expanded\s*\{[^}]*max-height:\s*min\(calc\(100svh - 128px\),\s*720px\);/s);
    assert.match(css, /\.explore-pin-preview\.is-expanded\s*\{[^}]*overscroll-behavior:\s*contain;/s);
    assert.match(css, /\.explore-pin-preview\.is-expanded \.pin-preview-photo-button img\s*\{[^}]*max-height:\s*min\(52svh,\s*460px\);/s);
});

test('photo like controls are limited to Explore and liked-photo detail contexts', () => {
    const source = readFileSync('js/app.js', 'utf8');

    assert.match(source, /const canLike = \['explore', 'liked'\]\.includes\(context\)/);
    assert.match(source, /likePanel\.hidden = !canLike/);
    assert.match(source, /updatePhotoDetailModal\(photo,\s*\{ context: 'explore' \}\)/);
});
