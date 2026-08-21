import assert from 'node:assert/strict';
import test from 'node:test';

import {
    animateExploreMapCamera,
    getExploreMapCameraFrame
} from '../js/explore-map-camera.mjs';

test('camera animation eases both the map center and zoom together', () => {
    const frame = getExploreMapCameraFrame({
        startCenter: { lat: 37, lng: 126 },
        targetCenter: { lat: 38, lng: 128 },
        startZoom: 8,
        targetZoom: 12,
        progress: 0.5
    });

    assert.ok(frame.center.lat > 37 && frame.center.lat < 38);
    assert.ok(frame.center.lng > 126 && frame.center.lng < 128);
    assert.ok(frame.zoom > 8 && frame.zoom < 12);
});

test('camera animation reaches the requested center and fully split zoom', async () => {
    const calls = [];
    const frames = [];
    const map = {
        getCenter: () => ({ lat: () => 37, lng: () => 126 }),
        getZoom: () => 8,
        moveCamera: (camera) => calls.push(camera)
    };
    const animation = animateExploreMapCamera(map, {
        center: { lat: 38, lng: 128 },
        zoom: 12
    }, {
        duration: 400,
        now: () => 0,
        requestFrame: (callback) => frames.push(callback)
    });

    frames.shift()(0);
    frames.shift()(200);
    frames.shift()(400);
    await animation;

    assert.ok(calls.length >= 3);
    assert.deepEqual(calls.at(-1), { center: { lat: 38, lng: 128 }, zoom: 12 });
});

test('camera animation settles at the final view when a browser frame is delayed', async () => {
    const calls = [];
    const timers = [];
    const map = {
        getCenter: () => ({ lat: () => 37, lng: () => 126 }),
        getZoom: () => 8,
        moveCamera: (camera) => calls.push(camera)
    };
    const animation = animateExploreMapCamera(map, {
        center: { lat: 38, lng: 128 },
        zoom: 12
    }, {
        requestFrame: () => 1,
        cancelFrame: () => {},
        setTimer: (callback) => {
            timers.push(callback);
            return timers.length;
        },
        clearTimer: () => {}
    });

    timers.shift()();
    await animation;

    assert.deepEqual(calls, [{ center: { lat: 38, lng: 128 }, zoom: 12 }]);
});
