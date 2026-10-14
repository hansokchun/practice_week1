import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('native app ships the shared web product and keeps its server photo and full album flows', () => {
    const config = JSON.parse(readFileSync('capacitor.config.json', 'utf8'));
    assert.equal(config.appId, 'com.ikkyee.mobile');
    assert.equal(config.webDir, 'app-shell/www');
    assert.equal(config.android.path, 'app-shell/android');
    assert.equal(config.ios.path, 'app-shell/ios');
    assert.equal(config.server?.url, undefined);
    assert.equal(config.server?.cleartext, undefined);
    const webApp = readFileSync('js/app.js', 'utf8');
    assert.match(webApp, /loadSavedLibrary/);
    assert.match(webApp, /createAlbum/);
    assert.match(webApp, /updateAlbum/);
    assert.match(webApp, /deleteAlbum/);
    assert.doesNotMatch(webApp, /MediaLibrary|scanDevicePhoto|local-photo-indexing-runtime/);
});

test('native and web builds write to independent output directories from the same HTML entry', () => {
    const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
    assert.equal(scripts['app:build'], 'vite build --mode native');
    assert.equal(scripts['app:sync'], 'npm run app:build && cap sync');
    const config = readFileSync('vite.config.mjs', 'utf8');
    assert.match(config, /mode === 'native'/);
    assert.match(config, /app-shell\/www/);
    assert.match(config, /outDir:.*native.*app-shell\/www.*dist/);
});
