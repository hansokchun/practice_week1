import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { markNativeBoot } from '../js/native-boot-diagnostics.mjs';

test('boot diagnostics only emit fixed stages, never exception messages or account data', () => {
    const calls = [];
    const target = { IkkyeeBoot: { mark: value => calls.push(value) } };
    markNativeBoot('MODULE_READY', target);
    markNativeBoot('EVENTS_READY', target);
    markNativeBoot('secret token', target);
    assert.deepEqual(calls, ['MODULE_READY', 'EVENTS_READY']);
    assert.doesNotThrow(() => markNativeBoot('MODULE_READY', {}));
    assert.doesNotThrow(() => markNativeBoot('MODULE_READY', { IkkyeeBoot: { mark() { throw new Error(); } } }));
});

test('Android boot diagnostic bridge is debug-only and accepts only fixed enum values', () => {
    const source = readFileSync('app-shell/android/app/src/main/java/com/ikkyee/mobile/MainActivity.java', 'utf8');
    assert.match(source, /getApplicationInfo\(\).flags & ApplicationInfo.FLAG_DEBUGGABLE/);
    assert.match(source, /BootStage.valueOf\(stage\)/);
    assert.match(source, /@JavascriptInterface/);
    assert.doesNotMatch(source, /setWebContentsDebuggingEnabled|loggingBehavior|Log\.[idwe]\([^;]*exception/);
});
