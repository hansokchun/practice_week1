import assert from 'node:assert/strict';
import { test } from 'node:test';
import { installNativeMapConsoleDiagnostics } from '../js/native-map-console-diagnostics.mjs';

test('map console diagnostics emit only known error codes, never URLs or arbitrary messages', () => {
    const stages = [], original = [];
    const target = { IkkyeeBoot: { mark: code => stages.push(code) },
        console: { error: (...args) => original.push(args), warn: (...args) => original.push(args) } };
    const restore = installNativeMapConsoleDiagnostics(target);
    target.console.error('Google Maps JavaScript API error: RefererNotAllowedMapError https://private.example/?key=secret');
    target.console.warn('Google Maps JavaScript API error: ApiTargetBlockedMapError');
    target.console.error('private account data', { toString() { throw Error('Do not inspect objects'); } });
    assert.deepEqual(stages, ['MAP_REFERER_NOT_ALLOWED', 'MAP_API_BLOCKED']);
    assert.equal(original.length, 3);
    restore();
    target.console.error('RefererNotAllowedMapError');
    assert.equal(stages.length, 2);
});

test('normal web/release console is untouched and a broken diagnostic sink cannot swallow logs', () => {
    const original = () => {};
    const web = { console: { error: original } };
    installNativeMapConsoleDiagnostics(web);
    assert.equal(web.console.error, original);
    let calls = 0;
    const debug = { IkkyeeBoot: { mark() { throw Error('unavailable'); } }, console: { error() { calls++; } } };
    installNativeMapConsoleDiagnostics(debug);
    assert.doesNotThrow(() => debug.console.error('InvalidKeyMapError'));
    assert.equal(calls, 1);
});
