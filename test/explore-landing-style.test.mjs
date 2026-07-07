import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync('style.css', 'utf8');
const source = readFileSync('js/app.js', 'utf8');
const design = readFileSync('DESIGN.md', 'utf8');

test('Explore map controls follow the landing surface and accent language', () => {
    assert.match(css, /\.explore-map-canvas\s*\{[^}]*linear-gradient\(180deg,\s*var\(--bg\)\s*0%,\s*var\(--surface\)\s*100%\);/s);
    assert.match(css, /\.explore-map-canvas\s*\{[^}]*width:\s*100vw;/s);
    assert.match(css, /\.map-search\s*\{[^}]*border:\s*1px solid rgba\(26,\s*77,\s*78,\s*0\.14\);[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.96\);[^}]*0 24px 60px rgba\(26,\s*77,\s*78,\s*0\.16\)/s);
    assert.match(css, /\.map-search\s*\{[^}]*border-radius:\s*12px;/s);
    assert.match(css, /\.map-search button\s*\{[^}]*background:\s*var\(--teal-dark\);/s);
    assert.match(css, /\.explore-photo-scope\s*\{[^}]*position:\s*relative;[^}]*justify-content:\s*flex-end;[^}]*justify-self:\s*end;/s);
    assert.match(css, /\.explore-photo-scope-trigger\s*\{[^}]*min-height:\s*38px;[^}]*border-radius:\s*8px;[^}]*background:\s*var\(--teal-dark\);[^}]*padding:\s*0 14px;/s);
    assert.match(css, /\.explore-photo-scope-menu\s*\{[^}]*top:\s*calc\(100% \+ 6px\);[^}]*right:\s*0;[^}]*z-index:\s*20;[^}]*border-radius:\s*9px;[^}]*background:\s*#ffffff;/s);
    assert.doesNotMatch(css, /\.explore-photo-scope-copy\s*\{/);
    assert.doesNotMatch(css, /\.explore-photo-scope-control\s*\{/);
    assert.match(css, /\.explore-photo-scope-menu button\s*\{[^}]*grid-template-columns:\s*20px minmax\(0,\s*1fr\) 18px;[^}]*min-height:\s*38px;[^}]*font-size:\s*14px;/s);
    assert.match(css, /\.explore-photo-scope-menu button\.active\s*\{[^}]*color:\s*var\(--teal-dark\);/s);
});

test('Explore preview and discovery panels use landing-style archive cards', () => {
    assert.match(css, /\.explore-pin-preview\s*\{[^}]*border:\s*1px solid rgba\(26,\s*77,\s*78,\s*0\.14\);[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.97\);[^}]*0 30px 70px rgba\(70,\s*40,\s*32,\s*0\.18\)/s);
    assert.match(css, /\.explore-pin-preview\s*\{[^}]*border-radius:\s*10px;/s);
    assert.match(css, /\.pin-preview-story\s*\{[^}]*background:\s*var\(--bg\);/s);
    assert.match(css, /\.explore-discovery-panel\s*\{[^}]*width:\s*min\(390px,\s*calc\(100% - 56px\)\);[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.97\);[^}]*0 30px 70px rgba\(70,\s*40,\s*32,\s*0\.16\)/s);
    assert.match(css, /\.explore-discovery-panel\s*\{[^}]*border-radius:\s*10px;/s);
    assert.match(css, /\.explore-discovery-header h2\s*\{[^}]*color:\s*var\(--teal-dark\);[^}]*font-size:\s*28px;/s);
    assert.match(css, /\.explore-discovery-item\s*\{[^}]*border-radius:\s*0;[^}]*box-shadow:\s*none;/s);
    assert.doesNotMatch(css, /\.explore-discovery-copy\s*\{/);
    assert.doesNotMatch(css, /\.explore-discovery-time\s*\{/);
});

test('Explore photo thumbnails keep straight corners and a consistent discovery frame', () => {
    assert.match(css, /\.explore-photo-pin img\s*\{[^}]*border-radius:\s*0;/s);
    assert.match(css, /\.map-pin img\s*\{[^}]*border-radius:\s*0;/s);
    assert.match(css, /\.pin-preview-photo-button\s*\{[^}]*border-radius:\s*0;/s);
    assert.match(css, /\.explore-discovery-image\s*\{[^}]*width:\s*100%;[^}]*aspect-ratio:\s*4 \/ 3;[^}]*border-radius:\s*0;[^}]*overflow:\s*hidden;/s);
    assert.match(css, /\.explore-discovery-item img\s*\{[^}]*border-radius:\s*0;/s);
    assert.match(css, /\.explore-discovery-item img\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;/s);
    assert.doesNotMatch(css, /\.explore-discovery-item img\s*\{[^}]*aspect-ratio:\s*1 \/ 1;/s);
    assert.match(css, /\.explore-discovery-item img\s*\{[^}]*object-fit:\s*cover;/s);
});

test('Explore discovery cards render image-only entries without inline metadata', () => {
    const fnStart = source.indexOf('function renderExploreDiscoveryPanel');
    const fnEnd = source.indexOf('async function ensureExploreMap', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /const description = getPhotoDescriptionText\(photo\)/);
    assert.match(body, /<span class="explore-discovery-image">/);
    assert.doesNotMatch(body, /explore-discovery-copy/);
    assert.doesNotMatch(body, /explore-discovery-time/);
});

test('DESIGN documents the Explore map shell visual language', () => {
    assert.match(design, /Search, photo-scope filters, discovery panels, and pin previews sit on warm white elevated surfaces/);
    assert.match(design, /Each thumbnail fills the panel width in a consistent 4:3 frame/);
    assert.match(design, /description or relative-time metadata appears only after opening the photo preview/);
});
