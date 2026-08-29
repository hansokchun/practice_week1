import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    EXPLORE_CLUSTER_PIN_COLOR,
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
    assert.equal(icon.strokeColor, EXPLORE_PHOTO_PIN_COLOR);
    assert.equal(icon.strokeWeight, 0);
    assert.match(icon.url, /^data:image\/svg\+xml;charset=UTF-8,/);
    assert.match(svg, /M14 35C/);
    assert.match(svg, /<mask id="photo-pin-mask">/);
    assert.match(svg, /<circle cx="14" cy="14" r="5\.2" fill="#000000" \/>/);
    assert.match(svg, /mask="url\(#photo-pin-mask\)"/);
    assert.doesNotMatch(svg, /<circle cx="14" cy="14" r="5\.2" fill="#ffffff" \/>/);
    assert.doesNotMatch(svg, /stroke="#ffffff"/);
    assert.doesNotMatch(svg, /drop-shadow|filter=/);
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
    const svg = decodeIconSvg(clusterIcon);

    assert.notEqual(clusterIcon.fillColor, photoIcon.fillColor);
    assert.ok(clusterIcon.scaledSize.width > photoIcon.scaledSize.width);
    assert.equal(clusterIcon.strokeColor, EXPLORE_CLUSTER_PIN_COLOR);
    assert.equal(clusterIcon.strokeWeight, 0);
    assert.match(clusterIcon.url, /^data:image\/svg\+xml;charset=UTF-8,/);
    assert.match(svg, /<mask id="cluster-pin-mask">/);
    assert.match(svg, /<circle cx="17" cy="16\.5" r="5\.6" fill="#000000" \/>/);
    assert.match(svg, /mask="url\(#cluster-pin-mask\)"/);
    assert.doesNotMatch(svg, /stroke="#ffffff"/);
    assert.doesNotMatch(svg, /drop-shadow|filter=/);
});

test('Explore selected photo pin is larger and layered above normal pins', () => {
    const maps = createMapsStub();
    const photoIcon = getExplorePinSymbolIcon(maps, { type: 'photo' });
    const selectedIcon = getExplorePinSymbolIcon(maps, { type: 'photo', selected: true });
    const svg = decodeIconSvg(selectedIcon);

    assert.ok(selectedIcon.scaledSize.width > photoIcon.scaledSize.width);
    assert.ok(selectedIcon.scaledSize.height > photoIcon.scaledSize.height);
    assert.equal(selectedIcon.strokeWeight, 0);
    assert.equal(selectedIcon.strokeColor, EXPLORE_SELECTED_PIN_COLOR);
    assert.notEqual(selectedIcon.fillColor, photoIcon.fillColor);
    assert.equal(selectedIcon.fillColor, EXPLORE_SELECTED_PIN_COLOR);
    assert.equal(selectedIcon.anchor.x, 32);
    assert.equal(selectedIcon.anchor.y, 62);
    assert.match(svg, /M32 62C28 56\.5 12 41 12 28A20 20/);
    assert.match(svg, /<mask id="selected-pin-mask">/);
    assert.match(svg, /<circle cx="32" cy="28" r="8" fill="#000000" \/>/);
    assert.match(svg, /mask="url\(#selected-pin-mask\)"/);
    assert.doesNotMatch(svg, /<circle cx="32" cy="28" r="8" fill="#ffffff" \/>/);
    assert.doesNotMatch(svg, /stroke="#ffffff"/);
    assert.doesNotMatch(svg, /drop-shadow|filter=/);
    assert.match(svg, /<ellipse cx="32" cy="62" rx="4" ry="1\.5"/);
    assert.match(svg, /<animate attributeName="rx" values="4;30" dur="1\.8s" repeatCount="indefinite" \/>/);
    assert.match(svg, /<animate attributeName="ry" values="1\.5;8" dur="1\.8s" repeatCount="indefinite" \/>/);
    assert.match(svg, /<animateTransform attributeName="transform" type="translate" values="0 0;0 -7;0 2;0 0"/);
    assert.match(svg, /dur="0\.44s" repeatCount="1" \/>/);
});
