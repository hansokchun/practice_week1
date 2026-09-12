import assert from 'node:assert/strict';
import test from 'node:test';
import { getExploreMarkerClusters } from '../js/explore-marker-clusters.mjs';

// Reference the original first-match, moving-centroid behavior independently of the spatial index.
function referenceGroups(photos, zoom, radius) {
    const groups = [];
    const scale = 256 * 2 ** zoom;
    for (const photo of photos) {
        const sin = Math.sin(Math.max(-85.05112878, Math.min(85.05112878, photo.lat)) * Math.PI / 180);
        const x = (photo.lng + 180) / 360 * scale;
        const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
        const found = groups.find((group) => Math.hypot(group.x - x, group.y - y) <= radius);
        if (!found) groups.push({ x, y, ids: [photo.id] });
        else {
            found.ids.push(photo.id);
            found.x = (found.x * (found.ids.length - 1) + x) / found.ids.length;
            found.y = (found.y * (found.ids.length - 1) + y) / found.ids.length;
        }
    }
    return groups.map((group) => group.ids);
}

test('spatial clustering preserves first-match groups through centroid cell changes and zoom changes', () => {
    let seed = 123456;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    for (const spread of [0.02, 5, 160]) {
        const photos = Array.from({ length: 800 }, (_, id) => ({ id: String(id), lat: (random() - 0.5) * spread, lng: (random() - 0.5) * spread }));
        for (const zoom of [3, 7, 12, 18]) {
            for (const radius of [0, 54, 90]) {
                assert.deepEqual(getExploreMarkerClusters(photos, zoom, radius).map((group) => group.photos.map((photo) => photo.id)), referenceGroups(photos, zoom, radius));
            }
        }
    }
});

test('non-finite coordinates cannot enter the spatial grid loop', () => {
    const photos = [{ id: 'bad', lat: 0, lng: Infinity }, { id: 'valid', lat: 0, lng: 0 }];
    assert.equal(getExploreMarkerClusters(photos).length, 2);
});
