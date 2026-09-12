import assert from 'node:assert/strict';
import test from 'node:test';
import config from '../vite.config.mjs';

test('native app builds do not trigger web reloads and repeated backend reads', () => {
    assert.ok(config.server.watch.ignored.includes('**/mobile/**'));
});
