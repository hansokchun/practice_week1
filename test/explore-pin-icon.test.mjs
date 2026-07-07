import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    EXPLORE_SELECTED_PIN_COLOR,
    EXPLORE_PHOTO_PIN_COLOR,
    getExplorePinSymbolIcon
} from '../js/explore-pin-icon.mjs';

function createMapsStub() {
    return {
        Point: class Point {
            constructor(x, y) {
                this.x = x;
                this.y = y;
            }
        },
        Size: class Size {
            constructor(width, height) {
                this.width = width;
                this.height = height;
            }
        }
    };
}

function decodeIconSvg(icon) {
    const [, encoded] = icon.url.split(',');
    return decodeURIComponent(encoded);
}

test('Explore photo pin icon uses a visible Google Maps symbol color', () => {
    const maps = createMapsStub();
    const icon = getExplorePinSymbolIcon(maps, { type: 'photo' });
    const svg = decodeIconSvg(icon);

    assert.equal(icon.fillColor, EXPLORE_PHOTO_PIN_COLOR);
    assert.equal(icon.strokeColor, '#ffffff');
    assert.match(icon.url, /^data:image\/svg\+xml;charset=UTF-8,/);
    assert.match(svg, /M14 35C/);
    assert.match(svg, /<circle cx="14" cy="14" r="5\.2" fill="#ffffff" \/>/);
    assert.doesNotMatch(svg, /<animate /);
    assert.equal(icon.scaledSize.width, 28);
    assert.equal(icon.scaledSize.height, 36);
    assert.equal(icon.anchor.x, 14);
    assert.equal(icon.anchor.y, 35);
});

test('Explore cluster pin icon is visually distinct from a photo pin', () => {
    const maps = createMapsStub();
    const photoIcon = getExplorePinSymbolIcon(maps, { type: 'photo' });
    const clusterIcon = getExplorePinSymbolIcon(maps, { type: 'cluster' });

    assert.notEqual(clusterIcon.fillColor, photoIcon.fillColor);
    assert.ok(clusterIcon.scaledSize.width > photoIcon.scaledSize.width);
    assert.equal(clusterIcon.strokeColor, '#ffffff');
    assert.match(clusterIcon.url, /^data:image\/svg\+xml;charset=UTF-8,/);
});

test('Explore selected photo pin is larger and layered above normal pins', () => {
    const maps = createMapsStub();
    const photoIcon = getExplorePinSymbolIcon(maps, { type: 'photo' });
    const selectedIcon = getExplorePinSymbolIcon(maps, { type: 'photo', selected: true });
    const svg = decodeIconSvg(selectedIcon);

    assert.ok(selectedIcon.scaledSize.width > photoIcon.scaledSize.width);
    assert.ok(selectedIcon.scaledSize.height > photoIcon.scaledSize.height);
    assert.ok(selectedIcon.strokeWeight > photoIcon.strokeWeight);
    assert.notEqual(selectedIcon.fillColor, photoIcon.fillColor);
    assert.equal(selectedIcon.fillColor, EXPLORE_SELECTED_PIN_COLOR);
    assert.equal(selectedIcon.anchor.x, 32);
    assert.equal(selectedIcon.anchor.y, 62);
    assert.match(svg, /M32 62C28 56\.5 12 41 12 28A20 20/);
    assert.match(svg, /<animate attributeName="r" values="20;34" dur="1\.8s" repeatCount="indefinite" \/>/);
    assert.match(svg, /<animate attributeName="fill-opacity" values="0\.28;0" dur="1\.8s" repeatCount="indefinite" \/>/);
});
