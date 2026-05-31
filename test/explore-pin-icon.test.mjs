import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EXPLORE_PIN_COLOR, getExplorePinSymbolIcon } from '../js/explore-pin-icon.mjs';

test('Explore pin icon uses a Google Maps symbol instead of an image URL', () => {
    const maps = {
        Point: class Point {
            constructor(x, y) {
                this.x = x;
                this.y = y;
            }
        }
    };
    const icon = getExplorePinSymbolIcon(maps);

    assert.equal(icon.fillColor, EXPLORE_PIN_COLOR);
    assert.equal(icon.strokeColor, '#ffffff');
    assert.equal(icon.url, undefined);
    assert.ok(icon.path.includes('M24 45'));
    assert.equal(icon.anchor.x, 24);
    assert.equal(icon.anchor.y, 45);
});
