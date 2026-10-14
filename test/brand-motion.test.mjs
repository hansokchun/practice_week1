import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getBrandMotionProgress, labelBrandDots } from '../scripts/brand-motion.mjs';

test('brand motion reveals six dots, then symbol, then wordmark, and holds the original', () => {
    const start = getBrandMotionProgress(0);
    assert.deepEqual(start.dots, [0, 0, 0, 0, 0, 0]);
    assert.equal(start.symbol, 0);
    assert.equal(start.wordmark, 0);
    const middle = getBrandMotionProgress(0.4);
    assert.equal(middle.dots[0], 1);
    assert.ok(middle.dots[5] < middle.dots[0]);
    assert.equal(middle.wordmark, 0);
    const end = getBrandMotionProgress(1.8);
    assert.deepEqual(end.dots, [1, 1, 1, 1, 1, 1]);
    assert.equal(end.symbol, 1);
    assert.equal(end.wordmark, 1);
    assert.equal(end.symbolOffset, 0);
    assert.deepEqual(getBrandMotionProgress(10), end);
    assert.throws(() => getBrandMotionProgress(NaN), /finite/);
});

test('dot masks classify existing artwork without redrawing or dropping alpha pixels', () => {
    const width = 40;
    const height = 50;
    const alpha = new Uint8Array(width * height);
    for (let y = 5; y < 11; y += 1) for (let x = 20; x < 25; x += 1) alpha[y * width + x] = 255;
    for (let y = 32; y <= 47; y += 3) alpha[y * width + 2] = 200;
    const { labels, dots } = labelBrandDots(alpha, width, height, 1);
    assert.equal(dots.length, 6);
    assert.equal(labels.length, alpha.length);
    assert.equal(labels[47 * width + 2], 1, 'the trail starts at its lowest dot');
    assert.equal(labels[32 * width + 2], 6);
    assert.equal(labels[5 * width + 20], 0, 'the rest of the symbol stays intact');
    assert.equal([...alpha].filter(value => value > 0).length, 36);
    assert.throws(() => labelBrandDots(new Uint8Array(2), 10, 10), /dimensions/);
});

test('video exports are fingerprinted, silent full-HD clips from the fixed brand sources', () => {
    const manifest = JSON.parse(readFileSync('public/brand/animation/manifest.json'));
    assert.equal(manifest.duration, 3);
    assert.equal(manifest.fps, 30);
    assert.equal(manifest.width, 1920);
    assert.equal(manifest.height, 1080);
    assert.equal(manifest.frames, 90);
    assert.equal(manifest.audio, false);
    assert.equal(manifest.assets.length, 5);
    for (const source of manifest.sources) {
        assert.equal(createHash('sha256').update(readFileSync(source.path)).digest('hex'), source.sha256);
    }
    for (const asset of manifest.assets) {
        const bytes = readFileSync(`public/brand/animation/${asset.path}`);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
        assert.equal(bytes.length, asset.bytes);
        assert.ok(bytes.length < 25 * 1024 * 1024, 'Cloudflare Pages per-file budget');
    }
    assert.equal(manifest.assets.filter(asset => asset.alpha).length, 2);
    const html = readFileSync('public/brand/index.html', 'utf8');
    assert.match(html, /<video[^>]*controls[^>]*playsinline[^>]*preload="none"/);
    assert.doesNotMatch(html, /<video[^>]*autoplay/);
});
