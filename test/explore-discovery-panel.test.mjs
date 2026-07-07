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
    const panelStart = html.indexOf('id="explore-list"');
    const panelEnd = html.indexOf('</aside>', panelStart);
    const panel = html.slice(panelStart, panelEnd);

    assert.doesNotMatch(panel, /<p class="eyebrow">Explore<\/p>/);
    assert.doesNotMatch(panel, /현재 지도 화면 안의 공개 사진/);
    assert.match(css, /\.explore-discovery-panel\s*\{[^}]*position:\s*absolute;[^}]*top:\s*16px;[^}]*right:\s*16px;/s);
    assert.match(css, /@media \(max-width: 860px\)[\s\S]*\.explore-discovery-panel\s*\{[^}]*display:\s*block;[^}]*top:\s*66px;[^}]*left:\s*12px;[^}]*right:\s*12px;/s);
    assert.match(css, /@media \(max-width: 860px\)[\s\S]*\.explore-discovery-header,\s*\.explore-discovery-body\s*\{[^}]*display:\s*none;/s);
    assert.match(css, /@media \(max-width: 860px\)[\s\S]*\.explore-discovery-panel \.explore-photo-scope\s*\{[^}]*pointer-events:\s*auto;/s);
});

test('Explore map does not render the old pin instruction hint', () => {
    const html = readFileSync('index.html', 'utf8');
    const css = readFileSync('style.css', 'utf8');

    assert.doesNotMatch(html, /지도에서 핀을 누르면 공개 여행을 볼 수 있습니다/);
    assert.doesNotMatch(html, /class="map-hint"/);
    assert.doesNotMatch(css, /\.map-hint/);
});

test('Explore discovery panel can be collapsed and reopened from its header', () => {
    const html = readFileSync('index.html', 'utf8');
    const css = readFileSync('style.css', 'utf8');
    const source = readFileSync('js/app.js', 'utf8');
    const rendererStart = source.indexOf('function renderExploreDiscoveryPanel');
    const rendererEnd = source.indexOf('async function ensureExploreMap', rendererStart);
    const renderer = source.slice(rendererStart, rendererEnd);

    assert.match(html, /id="btn-toggle-explore-discovery"/);
    assert.match(html, /aria-controls="explore-discovery-body"/);
    assert.match(html, /aria-expanded="true"/);
    assert.match(css, /\.explore-discovery-panel\.is-collapsed\s*\{[^}]*width:\s*auto;/s);
    assert.match(css, /\.explore-discovery-panel\.is-collapsed\s+\.explore-discovery-body\s*\{[^}]*display:\s*none;/s);
    assert.match(source, /function toggleExploreDiscoveryPanel\(\)/);
    assert.match(source, /btn-toggle-explore-discovery/);
    assert.match(source, /setAttribute\('aria-expanded', String\(!nextCollapsed\)\)/);
});

test('Explore discovery items preserve original photo ratios without inline metadata', () => {
    const css = readFileSync('style.css', 'utf8');
    const source = readFileSync('js/app.js', 'utf8');
    const rendererStart = source.indexOf('function renderExploreDiscoveryPanel');
    const rendererEnd = source.indexOf('async function ensureExploreMap', rendererStart);
    const renderer = source.slice(rendererStart, rendererEnd);

    assert.match(css, /\.explore-discovery-list\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*gap:\s*8px;/s);
    assert.match(css, /\.explore-discovery-item\s*\{[^}]*flex:\s*0 0 auto;[^}]*display:\s*block;[^}]*border-radius:\s*0;[^}]*box-shadow:\s*none;/s);
    assert.match(css, /\.explore-discovery-image\s*\{[^}]*width:\s*100%;[^}]*border-radius:\s*0;[^}]*overflow:\s*hidden;/s);
    assert.match(css, /\.explore-discovery-item img\s*\{[^}]*display:\s*block;[^}]*width:\s*100%;[^}]*height:\s*auto;[^}]*border-radius:\s*0;/s);
    assert.match(renderer, /const selected = photo\.id && photo\.id === state\.selectedPhotoId \? ' is-selected' : '';/);
    assert.doesNotMatch(css, /\.explore-discovery-item\.is-selected\s*\{/);
    assert.doesNotMatch(css, /\.explore-discovery-item\.is-selected,[\s\S]*var\(--coral\)/);
    assert.doesNotMatch(css, /\.explore-discovery-image\s*\{[^}]*height:\s*100cqw;/s);
    assert.doesNotMatch(css, /\.explore-discovery-item img\s*\{[^}]*object-fit:\s*cover;/s);
    assert.match(renderer, /<span class="explore-discovery-image">[\s\S]*<img src="\$\{escapeHtml\(photo\.url \|\| photo\.albumCoverUrl \|\| 'images\/main_bg2\.jpg'\)\}"/);
    assert.doesNotMatch(renderer, /const uploadTimeLabel = formatRelativeTime/);
    assert.doesNotMatch(renderer, /explore-discovery-copy/);
    assert.doesNotMatch(renderer, /explore-discovery-time/);
    assert.doesNotMatch(renderer, /const storyLabel = description \|\| label;/);
    assert.doesNotMatch(renderer, /Number\(photo\.lat\)\.toFixed\(4\), \$\{Number\(photo\.lng\)\.toFixed\(4\)\}/);
});

test('Explore discovery items keep descriptions only as accessibility labels', () => {
    const source = readFileSync('js/app.js', 'utf8');
    const rendererStart = source.indexOf('function renderExploreDiscoveryPanel');
    const rendererEnd = source.indexOf('async function ensureExploreMap', rendererStart);
    const renderer = source.slice(rendererStart, rendererEnd);

    assert.match(renderer, /const description = getPhotoDescriptionText\(photo\)/);
    assert.match(renderer, /aria-label="\$\{escapeHtml\(description \|\| label\)\} 사진 보기"/);
    assert.match(renderer, /alt="\$\{escapeHtml\(description \|\| label\)\}"/);
    assert.doesNotMatch(renderer, /explore-discovery-copy/);
    assert.doesNotMatch(renderer, /explore-discovery-time/);
    assert.doesNotMatch(renderer, /<strong>\$\{escapeHtml\(getPhotoFallbackLabel\(photo/);
    assert.doesNotMatch(renderer, /<strong>\$\{escapeHtml\(label\)\}<\/strong>/);
});

test('Explore discovery cards open the photo panel without direct like controls', () => {
    const css = readFileSync('style.css', 'utf8');
    const source = readFileSync('js/app.js', 'utf8');
    const rendererStart = source.indexOf('function renderExploreDiscoveryPanel');
    const rendererEnd = source.indexOf('async function ensureExploreMap', rendererStart);
    const renderer = source.slice(rendererStart, rendererEnd);
    const clickStart = source.indexOf("const photoLikeButton = event.target.closest('[data-toggle-photo-like]');");
    const discoveryStart = source.indexOf("const discoveryPhotoButton = event.target.closest('[data-explore-discovery-photo]');");

    assert.match(renderer, /<article class="explore-discovery-item/);
    assert.doesNotMatch(renderer, /<button class="explore-discovery-item/);
    assert.doesNotMatch(renderer, /class="photo-like-button explore-discovery-like-button/);
    assert.doesNotMatch(renderer, /data-like-surface="explore-discovery"/);
    assert.doesNotMatch(renderer, /const isLiked = Boolean\(photo\.id && state\.likedPhotoIds\.includes\(String\(photo\.id\)\)\)/);
    assert.doesNotMatch(css, /\.explore-discovery-like-button/);
    assert.match(source.slice(discoveryStart, source.indexOf("const goMyphotoButton", discoveryStart)), /openExplorePhotoPreview\(photo, \{ focusMap: true \}\)/);
    assert.ok(clickStart > -1 && discoveryStart > clickStart);
});

test('Explore discovery panel scrolls long photo lists inside the panel', () => {
    const css = readFileSync('style.css', 'utf8');

    assert.match(css, /\.explore-discovery-panel\s*\{[^}]*height:\s*clamp\(560px,\s*calc\(100svh - 32px\),\s*900px\);/s);
    assert.match(css, /\.explore-discovery-panel\s*\{[^}]*max-height:\s*calc\(100svh - 32px\);/s);
    assert.match(css, /\.explore-discovery-body\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\);[^}]*overflow:\s*hidden;/s);
    assert.match(css, /\.explore-discovery-list\s*\{[^}]*max-height:\s*100%;/s);
    assert.match(css, /\.explore-discovery-list\s*\{[^}]*overflow-y:\s*auto;/s);
    assert.doesNotMatch(css, /\.explore-discovery-list\s*\{[^}]*align-content:\s*start;/s);
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
    assert.match(css, /\.explore-discovery-panel\.is-collapsed\s*\{[^}]*top:\s*16px;[^}]*right:\s*16px;/s);
    assert.match(css, /\.explore-discovery-panel\.is-collapsed\s*\{[^}]*background:\s*var\(--teal-dark\);/s);
    assert.match(css, /\.explore-discovery-panel\.is-collapsed\s*\{[^}]*height:\s*auto;/s);
    assert.match(css, /\.explore-discovery-panel\.is-collapsed\s*\{[^}]*max-height:\s*none;/s);
    assert.match(css, /\.explore-discovery-panel\.is-collapsed\s*\{[^}]*min-width:\s*84px;/s);
    assert.match(css, /\.explore-discovery-panel\.is-collapsed\s*\{[^}]*padding:\s*10px\s+18px;/s);
    assert.match(css, /\.explore-discovery-panel\.is-collapsed\s*\{[^}]*cursor:\s*pointer;/s);
    assert.match(css, /\.explore-discovery-panel\.is-collapsed \.explore-discovery-header\s*\{[^}]*justify-items:\s*center;/s);
    assert.match(css, /\.explore-discovery-panel\.is-collapsed \.explore-discovery-header\s*\{[^}]*text-align:\s*center;/s);
    assert.match(css, /\.explore-discovery-panel\.is-collapsed \.explore-discovery-header h2\s*\{[^}]*color:\s*#ffffff;/s);
    assert.match(css, /\.explore-discovery-panel\.is-collapsed \.explore-discovery-header h2\s*\{[^}]*text-align:\s*center;/s);
    assert.match(css, /\.explore-discovery-panel\.is-collapsed \.explore-discovery-toggle\s*\{[^}]*display:\s*none;/s);
    assert.match(source, /const collapsedDiscoveryPanel = event\.target\.closest\('#explore-list\.is-collapsed'\);/);
    assert.match(source, /if \(collapsedDiscoveryPanel\) \{\s*toggleExploreDiscoveryPanel\(\);\s*return;\s*\}/s);
});
