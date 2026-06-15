import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    EXPLORE_PHOTO_PIN_COLOR,
    getExplorePinSymbolIcon
} from '../js/explore-pin-icon.mjs';

test('Explore photo pin icon uses a visible Google Maps symbol color', () => {
    const maps = {
        Point: class Point {
            constructor(x, y) {
                this.x = x;
                this.y = y;
            }
        }
    };
    const icon = getExplorePinSymbolIcon(maps, { type: 'photo' });

    assert.equal(icon.fillColor, EXPLORE_PHOTO_PIN_COLOR);
    assert.equal(icon.strokeColor, '#ffffff');
    assert.equal(icon.url, undefined);
    assert.ok(icon.path.includes('M24 45'));
    assert.equal(icon.anchor.x, 24);
    assert.equal(icon.anchor.y, 45);
});

test('Explore cluster pin icon is visually distinct from a photo pin', () => {
    const maps = {
        Point: class Point {
            constructor(x, y) {
                this.x = x;
                this.y = y;
            }
        }
    };
    const photoIcon = getExplorePinSymbolIcon(maps, { type: 'photo' });
    const clusterIcon = getExplorePinSymbolIcon(maps, { type: 'cluster' });

    assert.notEqual(clusterIcon.fillColor, photoIcon.fillColor);
    assert.ok(clusterIcon.scale > photoIcon.scale);
    assert.equal(clusterIcon.strokeColor, '#ffffff');
    assert.equal(clusterIcon.url, undefined);
});

test('Explore selected photo pin is larger and layered above normal pins', () => {
    const maps = {
        Point: class Point {
            constructor(x, y) {
                this.x = x;
                this.y = y;
            }
        }
    };
    const photoIcon = getExplorePinSymbolIcon(maps, { type: 'photo' });
    const selectedIcon = getExplorePinSymbolIcon(maps, { type: 'photo', selected: true });

    assert.ok(selectedIcon.scale > photoIcon.scale);
    assert.ok(selectedIcon.strokeWeight > photoIcon.strokeWeight);
    assert.notEqual(selectedIcon.fillColor, photoIcon.fillColor);
});
