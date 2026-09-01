import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getProfileMapPinSize } from '../js/profile-map-pin-size.mjs';

test('profile map pins stay small at country-level zoom', () => {
    assert.equal(getProfileMapPinSize(3), 14);
    assert.equal(getProfileMapPinSize(5), 16);
    assert.equal(getProfileMapPinSize(7), 19);
});

test('profile map pins grow gradually and stop at the normal pin size', () => {
    assert.equal(getProfileMapPinSize(9), 22);
    assert.equal(getProfileMapPinSize(13), 28);
    assert.equal(getProfileMapPinSize(20), 28);
});

test('profile map pin size handles missing zoom safely', () => {
    assert.equal(getProfileMapPinSize(undefined), 19);
});
