import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('desktop pointer hover gives the leaf pin a restrained lift', () => {
    const css = readFileSync('style.css', 'utf8');
    assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)[\s\S]*\.explore-map \.google-map-marker-image:hover\s*\{[^}]*transform:\s*translateY\(-2px\) scale\(1\.08\);/s);
});

test('Explore photo pin uses one branded leaf with a grounded stem', () => {
    const maps = createMapsStub();
    const icon = getExplorePinSymbolIcon(maps, { type: 'photo' });
    const svg = decodeIconSvg(icon);

    assert.equal(icon.fillColor, EXPLORE_PHOTO_PIN_COLOR);
    assert.equal(icon.strokeColor, EXPLORE_PHOTO_PIN_COLOR);
    assert.equal(icon.strokeWeight, 0);
    assert.match(icon.url, /^data:image\/svg\+xml;charset=UTF-8,/);
    assert.match(svg, /id="ikkyee-leaf-pin"/);
    assert.equal((svg.match(/class="leaf-shape"/g) || []).length, 1);
    assert.match(svg, /class="leaf-stem"/);
    assert.match(svg, /class="leaf-vein"/);
    assert.doesNotMatch(svg, /<animate /);
    assert.equal(icon.scaledSize.width, 36);
    assert.equal(icon.scaledSize.height, 44);
    assert.equal(icon.anchor.x, 18);
    assert.equal(icon.anchor.y, 42);
});

test('Explore cluster pin adds one smaller leaf beside the main leaf', () => {
    const maps = createMapsStub();
    const photoIcon = getExplorePinSymbolIcon(maps, { type: 'photo' });
    const clusterIcon = getExplorePinSymbolIcon(maps, { type: 'cluster' });
    const svg = decodeIconSvg(clusterIcon);

    assert.notEqual(clusterIcon.fillColor, photoIcon.fillColor);
    assert.ok(clusterIcon.scaledSize.width > photoIcon.scaledSize.width);
    assert.equal(clusterIcon.strokeColor, EXPLORE_CLUSTER_PIN_COLOR);
    assert.equal(clusterIcon.strokeWeight, 0);
    assert.match(clusterIcon.url, /^data:image\/svg\+xml;charset=UTF-8,/);
    assert.match(svg, /id="ikkyee-leaf-cluster"/);
    assert.equal((svg.match(/class="leaf-shape(?: |")/g) || []).length, 2);
    assert.match(svg, /class="leaf-shape leaf-shape--small"/);
    assert.equal(clusterIcon.scaledSize.width, 48);
    assert.equal(clusterIcon.scaledSize.height, 48);
    assert.equal(clusterIcon.anchor.x, 22);
    assert.equal(clusterIcon.anchor.y, 46);
});

test('Explore selected photo keeps the leaf silhouette and adds a restrained pulse', () => {
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
    assert.equal(selectedIcon.anchor.x, 28);
    assert.equal(selectedIcon.anchor.y, 62);
    assert.match(svg, /id="ikkyee-leaf-selected"/);
    assert.equal((svg.match(/class="leaf-shape"/g) || []).length, 1);
    assert.match(svg, /<ellipse cx="28" cy="62" rx="4" ry="1\.5"/);
    assert.match(svg, /<animate attributeName="rx" values="4;24" dur="1\.8s" repeatCount="indefinite" \/>/);
    assert.match(svg, /<animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 1;0 0"/);
    assert.match(svg, /dur="0\.42s" repeatCount="1" \/>/);
});
