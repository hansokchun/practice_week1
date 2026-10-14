import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const fingerprint = bytes => createHash('sha256').update(bytes).digest('hex');

test('native icon and splash delivery assets derive from the locked brand release', () => {
    const approved = JSON.parse(read('brand/manifest.json'));
    const native = JSON.parse(read('app-shell/brand-manifest.json'));
    const master = approved.assets.find(asset => asset.path === approved.master);
    assert.equal(native.brandVersion, approved.version);
    assert.equal(native.master, approved.master);
    assert.equal(native.masterSha256, master.sha256);
    assert.equal(fingerprint(read(native.master)), master.sha256);
    assert.equal(native.background, '#F9F7F2');
    assert.equal(native.assets.length, 30);
    for (const asset of native.assets) {
        assert.ok(asset.path.startsWith('app-shell/android/') || asset.path.startsWith('app-shell/ios/'));
        const bytes = read(asset.path);
        assert.equal(fingerprint(bytes), asset.sha256, asset.path);
        assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(bytes.readUInt32BE(16), asset.width, asset.path);
        assert.equal(bytes.readUInt32BE(20), asset.height, asset.path);
        assert.equal(bytes[25], asset.alpha ? 6 : 2, asset.path);
    }
    assert.ok(native.assets.filter(asset => asset.kind === 'foreground' || asset.kind === 'splash')
        .every(asset => asset.alpha), 'the logo and splash symbol keep transparency');
    assert.ok(native.assets.filter(asset => asset.kind === 'icon').every(asset => !asset.alpha));
});

test('every launcher density and iOS catalog image has a fingerprinted asset', () => {
    const manifest = JSON.parse(read('app-shell/brand-manifest.json'));
    const byPath = new Map(manifest.assets.map(asset => [asset.path, asset]));
    const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
    for (const [density, size] of Object.entries(densities)) {
        const base = `app-shell/android/app/src/main/res/mipmap-${density}`;
        for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
            assert.equal(byPath.get(`${base}/${name}`)?.width, size);
        }
        const foreground = byPath.get(`${base}/ic_launcher_foreground.png`);
        assert.equal(foreground?.width, Math.round(size * 108 / 48));
        assert.equal(foreground?.insetRatio, 112 / 1024);
    }
    const catalogRoot = 'app-shell/ios/App/App/Assets.xcassets';
    const iconCatalog = JSON.parse(read(`${catalogRoot}/AppIcon.appiconset/Contents.json`));
    for (const image of iconCatalog.images) {
        const asset = byPath.get(`${catalogRoot}/AppIcon.appiconset/${image.filename}`);
        assert.equal(asset?.width, 1024);
        assert.equal(asset?.alpha, false, 'App Store icons must be opaque');
    }
    const splashCatalog = JSON.parse(read(`${catalogRoot}/Splash.imageset/Contents.json`));
    for (const image of splashCatalog.images) {
        const asset = byPath.get(`${catalogRoot}/Splash.imageset/${image.filename}`);
        assert.equal(asset?.width, 180 * Number.parseInt(image.scale, 10));
        assert.equal(asset?.alpha, true);
    }
});
