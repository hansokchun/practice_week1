import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getWordmarkLayout } from '../scripts/brand-wordmark-layouts.mjs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const symbol = { left: 100, top: 80, width: 240, height: 280 };
const lettering = { left: 5, top: 140, width: 1200, height: 160 };

test('both wordmark layouts use a close visible gap and center the complete artwork', () => {
    for (const side of ['left', 'right']) {
        const layout = getWordmarkLayout({ width: 1800, symbol, lettering, gap: 24, side });
        const sx = layout.symbolLeft + symbol.left;
        const tx = layout.textLeft + lettering.left;
        if (side === 'left') assert.equal(tx - (sx + symbol.width), 24);
        else assert.equal(sx - (tx + lettering.width), 24);
        const start = Math.min(sx, tx);
        const end = Math.max(sx + symbol.width, tx + lettering.width);
        assert.equal(start, 168);
        assert.equal(1800 - end, start);
    }
});

test('wordmark placement rejects overlap, unsupported sides and overflowing artwork', () => {
    const options = { width: 1800, symbol, lettering, gap: 24, side: 'left' };
    assert.throws(() => getWordmarkLayout({ ...options, gap: -1 }), /gap/);
    assert.throws(() => getWordmarkLayout({ ...options, side: 'bottom' }), /side/);
    assert.throws(() => getWordmarkLayout({ ...options, width: 100 }), /exceeds/);
});

test('the two layout deliveries preserve existing lettering and symbol pixels', () => {
    const manifest = JSON.parse(read('public/brand/korean-wordmark-layouts/manifest.json'));
    const original = JSON.parse(read('public/brand/korean-wordmark/manifest.json'));
    assert.equal(manifest.text, '장소아카이브 이끼');
    assert.equal(manifest.runtimeReplacement, false);
    assert.deepEqual(manifest.layouts.map(layout => layout.id), ['close-left', 'close-right']);
    assert.equal(manifest.layouts[0].side, 'left');
    assert.equal(manifest.layouts[1].side, 'right');
    for (const source of manifest.sources) {
        assert.equal(source.sha256, hash(read(source.path)));
        assert.equal(source.sha256, original.assets.find(asset =>
            `public/brand/korean-wordmark/${asset.path}` === source.path).sha256);
    }
    assert.equal(manifest.assets.length, 8);
    for (const asset of manifest.assets) {
        assert.match(asset.path, /^[a-z0-9-]+\.png$/);
        const bytes = read(`public/brand/korean-wordmark-layouts/${asset.path}`);
        assert.equal(hash(bytes), asset.sha256, asset.path);
        assert.equal(bytes.readUInt32BE(16), 1800, asset.path);
        assert.equal(bytes.readUInt32BE(20), 440, asset.path);
        assert.equal(bytes[25], asset.transparent ? 6 : 2, asset.path);
        if (asset.transparent) {
            const source = manifest.sources.find(item => item.tone === asset.tone);
            assert.deepEqual(asset.contentHashes, source.contentHashes);
        }
    }
    const archive = read(`public/brand/korean-wordmark-layouts/${manifest.archive.path}`);
    assert.equal(archive.subarray(0, 4).toString('hex'), '504b0304');
    assert.equal(hash(archive), manifest.archive.sha256);
});

test('the layout comparison offers transparent files without replacing previous logos', () => {
    const html = read('public/brand/index.html').toString();
    assert.match(html, /id="korean-wordmark-layouts"/);
    assert.match(html, /korean-wordmark-layouts\/close-left-teal\.png/);
    assert.match(html, /korean-wordmark-layouts\/close-right-teal\.png/);
    assert.match(html, /korean-wordmark-layouts\/close-left-white\.png/);
    assert.match(html, /korean-wordmark-layouts\/close-right-white\.png/);
    assert.match(html, /korean-wordmark-layouts\/ikkyee-wordmark-layouts\.zip/);
    assert.match(html, /korean-wordmark\/lockup-teal\.png/);
});
