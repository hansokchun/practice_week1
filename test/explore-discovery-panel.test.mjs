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
    assert.match(html, /id="explore-discovery-title"[\s\S]*발견/);
    assert.match(css, /\.explore-discovery-panel\s*\{[^}]*position:\s*absolute;[^}]*right:\s*24px;/s);
    assert.match(css, /@media \(max-width: 860px\)[\s\S]*\.explore-discovery-panel\s*\{[^}]*display:\s*none;/s);
});
