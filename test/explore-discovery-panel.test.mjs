import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
    getExploreDiscoveryPhotos,
    normalizeExploreBounds
} from '../js/explore-discovery-panel.mjs';

test('Explore discovery panel keeps only photos inside the current map bounds', () => {
    const photos = [
        { id: 'inside-a', lat: 37.55, lng: 126.98, created_at: '2026-06-15T03:00:00Z' },
        { id: 'outside-lat', lat: 35.1, lng: 126.98, created_at: '2026-06-15T04:00:00Z' },
        { id: 'inside-b', lat: 37.61, lng: 127.04, created_at: '2026-06-15T02:00:00Z' },
        { id: 'outside-lng', lat: 37.55, lng: 129.2, created_at: '2026-06-15T05:00:00Z' }
    ];

    const visible = getExploreDiscoveryPhotos(photos, {
        bounds: { north: 37.7, south: 37.4, east: 127.2, west: 126.7 }
    });

    assert.deepEqual(visible.map((photo) => photo.id), ['inside-a', 'inside-b']);
});

test('Explore discovery panel lightly separates repeated uploaders after recency sorting', () => {
    const photos = [
        { id: 'a-newest', owner_id: 'owner-a', lat: 37.55, lng: 126.98, created_at: '2026-06-15T05:00:00Z' },
        { id: 'a-second', owner_id: 'owner-a', lat: 37.56, lng: 126.99, created_at: '2026-06-15T04:00:00Z' },
        { id: 'b-next', owner_id: 'owner-b', lat: 37.57, lng: 127.0, created_at: '2026-06-15T03:00:00Z' },
        { id: 'a-third', owner_id: 'owner-a', lat: 37.58, lng: 127.01, created_at: '2026-06-15T02:00:00Z' }
    ];

    const visible = getExploreDiscoveryPhotos(photos, {
        bounds: { north: 38, south: 37, east: 128, west: 126 }
    });

    assert.deepEqual(visible.map((photo) => photo.id), ['a-newest', 'b-next', 'a-second', 'a-third']);
});

test('Explore discovery panel accepts Google Maps bounds-like objects', () => {
    const bounds = normalizeExploreBounds({
        getNorthEast: () => ({ lat: () => 38, lng: () => 128 }),
        getSouthWest: () => ({ lat: () => 37, lng: () => 126 })
    });

    assert.deepEqual(bounds, { north: 38, south: 37, east: 128, west: 126 });
});

test('Explore shell exposes a desktop discovery panel instead of a hidden-only list', () => {
    const html = readFileSync('index.html', 'utf8');
    const css = readFileSync('style.css', 'utf8');

    assert.match(html, /id="explore-list" class="explore-discovery-panel"/);
    assert.match(html, /id="explore-discovery-title"[\s\S]*탐색/);
    assert.match(css, /\.explore-discovery-panel\s*\{[^}]*position:\s*absolute;[^}]*right:\s*24px;/s);
    assert.match(css, /@media \(max-width: 860px\)[\s\S]*\.explore-discovery-panel\s*\{[^}]*display:\s*none;/s);
});

test('Explore discovery panel can be collapsed and reopened from its header', () => {
    const html = readFileSync('index.html', 'utf8');
    const css = readFileSync('style.css', 'utf8');
    const source = readFileSync('js/app.js', 'utf8');

    assert.match(html, /id="btn-toggle-explore-discovery"/);
    assert.match(html, /aria-controls="explore-discovery-body"/);
    assert.match(html, /aria-expanded="true"/);
    assert.match(css, /\.explore-discovery-panel\.is-collapsed\s*\{[^}]*width:\s*auto;/s);
    assert.match(css, /\.explore-discovery-panel\.is-collapsed\s+\.explore-discovery-body\s*\{[^}]*display:\s*none;/s);
    assert.match(source, /function toggleExploreDiscoveryPanel\(\)/);
    assert.match(source, /btn-toggle-explore-discovery/);
    assert.match(source, /setAttribute\('aria-expanded', String\(!nextCollapsed\)\)/);
});

test('Explore discovery items are thumbnail-first and only show relative upload time', () => {
    const css = readFileSync('style.css', 'utf8');
    const source = readFileSync('js/app.js', 'utf8');

    assert.match(css, /\.explore-discovery-item\s*\{[^}]*grid-template-rows:\s*minmax\(170px,\s*auto\)\s+auto;/s);
    assert.match(css, /\.explore-discovery-item\s*\{[^}]*grid-template-columns:\s*1fr;/s);
    assert.match(css, /\.explore-discovery-item\s*\{[^}]*min-height:\s*212px;/s);
    assert.match(css, /\.explore-discovery-item img\s*\{[^}]*width:\s*100%;[^}]*height:\s*170px;/s);
    assert.match(source, /const uploadTimeLabel = formatRelativeTime\(photo\.created_at \|\| photo\.uploaded_at \|\| photo\.createdAt \|\| photo\.date\)/);
    assert.doesNotMatch(source, /<strong>\$\{escapeHtml\(label\)\}<\/strong>/);
    assert.doesNotMatch(source, /Number\(photo\.lat\)\.toFixed\(4\), \$\{Number\(photo\.lng\)\.toFixed\(4\)\}/);
});

test('Explore discovery panel scrolls long photo lists inside the panel', () => {
    const css = readFileSync('style.css', 'utf8');

    assert.match(css, /\.explore-discovery-panel\s*\{[^}]*height:\s*clamp\(560px,\s*calc\(100svh - 96px\),\s*900px\);/s);
    assert.match(css, /\.explore-discovery-panel\s*\{[^}]*max-height:\s*calc\(100svh - 96px\);/s);
    assert.match(css, /\.explore-discovery-body\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\);[^}]*overflow:\s*hidden;/s);
    assert.match(css, /\.explore-discovery-list\s*\{[^}]*max-height:\s*100%;/s);
    assert.match(css, /\.explore-discovery-list\s*\{[^}]*overflow-y:\s*auto;/s);
    assert.match(css, /\.explore-discovery-list\s*\{[^}]*align-content:\s*start;/s);
    assert.match(css, /\.explore-discovery-list\s*\{[^}]*overscroll-behavior:\s*contain;/s);
    assert.match(css, /\.explore-discovery-list\s*\{[^}]*scrollbar-gutter:\s*stable;/s);
});

test('Explore discovery collapsed state uses a compact Explore control', () => {
    const html = readFileSync('index.html', 'utf8');
    const css = readFileSync('style.css', 'utf8');
    const source = readFileSync('js/app.js', 'utf8');

    assert.match(html, /id="explore-discovery-title"[\s\S]*탐색/);
    assert.match(html, /aria-label="탐색 패널 접기"/);
    assert.match(source, /nextCollapsed \? '탐색 패널 열기' : '탐색 패널 접기'/);
    assert.match(css, /\.explore-discovery-panel\.is-collapsed\s*\{[^}]*border-radius:\s*999px;/s);
    assert.match(css, /\.explore-discovery-panel\.is-collapsed\s*\{[^}]*background:\s*var\(--teal\);/s);
    assert.match(css, /\.explore-discovery-panel\.is-collapsed \.explore-discovery-header h2\s*\{[^}]*color:\s*#ffffff;/s);
});
