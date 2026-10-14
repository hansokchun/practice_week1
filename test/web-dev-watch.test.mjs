import assert from 'node:assert/strict';
import test from 'node:test';
import config from '../vite.config.mjs';

test('native app builds do not trigger web reloads and repeated backend reads', () => {
    const resolved = typeof config === 'function' ? config({ mode: 'development' }) : config;
    assert.ok(resolved.server.watch.ignored.includes('**/mobile/**'));
    assert.ok(resolved.server.watch.ignored.includes('**/app-shell/**'));
});
