import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    EXPLORE_ALBUM_PIN_COLOR,
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

test('Explore album pin icon uses a different logo and color', () => {
    const maps = {
        Point: class Point {
            constructor(x, y) {
                this.x = x;
                this.y = y;
            }
        }
    };
    const photoIcon = getExplorePinSymbolIcon(maps, { type: 'photo' });
    const albumIcon = getExplorePinSymbolIcon(maps, { type: 'album' });

    assert.equal(albumIcon.fillColor, EXPLORE_ALBUM_PIN_COLOR);
    assert.notEqual(albumIcon.fillColor, photoIcon.fillColor);
    assert.notEqual(albumIcon.path, photoIcon.path);
    assert.ok(albumIcon.path.includes('M24 4'));
});
