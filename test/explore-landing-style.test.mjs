import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync('style.css', 'utf8');
const source = readFileSync('js/app.js', 'utf8');
const design = readFileSync('DESIGN.md', 'utf8');

test('Explore map controls follow the landing surface and accent language', () => {
    assert.match(css, /\.explore-map-canvas\s*\{[^}]*linear-gradient\(180deg,\s*var\(--bg\)\s*0%,\s*var\(--surface\)\s*100%\);/s);
    assert.match(css, /\.map-search\s*\{[^}]*border:\s*1px solid rgba\(26,\s*77,\s*78,\s*0\.14\);[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.96\);[^}]*0 24px 60px rgba\(26,\s*77,\s*78,\s*0\.16\)/s);
    assert.match(css, /\.map-search\s*\{[^}]*border-radius:\s*12px;/s);
    assert.match(css, /\.map-search button\s*\{[^}]*background:\s*var\(--teal-dark\);/s);
    assert.match(css, /\.explore-photo-scope\s*\{[^}]*border:\s*1px solid rgba\(26,\s*77,\s*78,\s*0\.14\);[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.96\);/s);
    assert.match(css, /\.explore-photo-scope\s*\{[^}]*border-radius:\s*12px;/s);
    assert.match(css, /\.explore-photo-scope button\.active\s*\{[^}]*background:\s*var\(--teal-dark\);/s);
});

test('Explore preview and discovery panels use landing-style archive cards', () => {
    assert.match(css, /\.explore-pin-preview\s*\{[^}]*border:\s*1px solid rgba\(26,\s*77,\s*78,\s*0\.14\);[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.97\);[^}]*0 30px 70px rgba\(70,\s*40,\s*32,\s*0\.18\)/s);
    assert.match(css, /\.explore-pin-preview\s*\{[^}]*border-radius:\s*10px;/s);
    assert.match(css, /\.pin-preview-story\s*\{[^}]*background:\s*var\(--bg\);/s);
    assert.match(css, /\.explore-discovery-panel\s*\{[^}]*width:\s*min\(390px,\s*calc\(100% - 56px\)\);[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.97\);[^}]*0 30px 70px rgba\(70,\s*40,\s*32,\s*0\.16\)/s);
    assert.match(css, /\.explore-discovery-panel\s*\{[^}]*border-radius:\s*10px;/s);
    assert.match(css, /\.explore-discovery-header h2\s*\{[^}]*color:\s*var\(--teal-dark\);[^}]*font-size:\s*28px;/s);
    assert.match(css, /\.explore-discovery-item\s*\{[^}]*border-radius:\s*8px;/s);
    assert.match(css, /\.explore-discovery-item strong\s*\{[^}]*color:\s*var\(--teal-dark\);[^}]*-webkit-line-clamp:\s*2;/s);
    assert.match(css, /\.explore-discovery-item small\s*\{[^}]*color:\s*var\(--coral\);/s);
});

test('Explore discovery cards render a concise story label before time metadata', () => {
    const fnStart = source.indexOf('function renderExploreDiscoveryPanel');
    const fnEnd = source.indexOf('async function ensureExploreMap', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /const storyLabel = description \|\| label;/);
    assert.match(body, /<strong>\$\{escapeHtml\(storyLabel\)\}<\/strong>/);
    assert.ok(body.indexOf('<strong>${escapeHtml(storyLabel)}</strong>') < body.indexOf('<small>${escapeHtml(uploadTimeLabel)}</small>'));
});

test('DESIGN documents the Explore map shell visual language', () => {
    assert.match(design, /Search, photo-scope filters, discovery panels, and pin previews sit on warm white elevated surfaces/);
    assert.match(design, /Large map panels use squared archive corners around 8-10px/);
    assert.match(design, /Public photo cards show the image first, then one concise story\/title line and relative time metadata/);
});
