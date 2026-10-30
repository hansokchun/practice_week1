import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisibleTimeTracker } from '../js/site-activity.mjs';

test('visible time excludes hidden and private screens and sends one bounded anonymous sample', () => {
    let time = 0;
    const sent = [];
    const tracker = createVisibleTimeTracker({ now: () => time, send: value => sent.push(value) });
    tracker.update({ visible: true, publicPage: true });
    time = 12500;
    tracker.update({ visible: false, publicPage: true });
    time = 50000;
    tracker.update({ visible: true, publicPage: false });
    time = 90000;
    tracker.update({ visible: true, publicPage: true });
    time = 100500;
    tracker.finish(); tracker.finish();
    assert.deepEqual(sent, [{ seconds: 23 }]);
    assert.deepEqual(Object.keys(sent[0]), ['seconds']);
});

test('sub-second entries are omitted and long entries stop at one hour', () => {
    for (const [elapsed, expected] of [[999, []], [8000000, [{ seconds: 3600 }]]]) {
        let time = 0; const sent = [];
        const tracker = createVisibleTimeTracker({ now: () => time, send: value => sent.push(value) });
        tracker.update({ visible: true, publicPage: true }); time = elapsed; tracker.finish();
        assert.deepEqual(sent, expected);
    }
});

test('finishing freezes the sample even when a back-forward cache document resumes', () => {
    let time = 0; const sent = [];
    const tracker = createVisibleTimeTracker({ now: () => time, send: value => sent.push(value) });
    tracker.update({ visible: true, publicPage: true }); time = 4000; tracker.finish();
    time = 10000; tracker.update({ visible: true, publicPage: true }); time = 20000; tracker.finish();
    assert.deepEqual(sent, [{ seconds: 4 }]);
});
