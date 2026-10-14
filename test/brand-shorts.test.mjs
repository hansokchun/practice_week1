import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getShortsMotion, SHORTS_LAYOUTS } from '../scripts/brand-shorts-motion.mjs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('shorts motion reveals the logo and holds while the overlay fades away at its end', () => {
    assert.equal(getShortsMotion(0, 'intro').wordmark, 0);
    const end = getShortsMotion(1.8, 'intro');
    assert.equal(end.symbol, 1);
    assert.equal(end.wordmark, 1);
    assert.deepEqual(end.dots, [1, 1, 1, 1, 1, 1]);
    assert.equal(getShortsMotion(0, 'outro').cta, 0);
    assert.equal(getShortsMotion(1.8, 'outro').website, 1);
    assert.equal(getShortsMotion(0, 'overlay').opacity, 0);
    assert.equal(getShortsMotion(0.4, 'overlay').opacity, 1);
    assert.ok(getShortsMotion(2.7, 'overlay').opacity < 1);
    assert.equal(getShortsMotion(3, 'overlay').opacity, 0);
    assert.throws(() => getShortsMotion(NaN, 'intro'), /finite/);
    assert.throws(() => getShortsMotion(0, 'unknown'), /kind/);
});

test('the selected portrait logo placements fit with space above and below for footage', () => {
    for (const layout of Object.values(SHORTS_LAYOUTS)) {
        assert.ok(layout.left >= 90);
        assert.ok(layout.left + layout.width <= 990);
        assert.ok(layout.top >= 150);
        assert.ok(layout.top + layout.height <= 1530);
    }
});

test('shorts assets preserve brand sources and include videos, overlays and reusable PNGs', () => {
    const manifest = JSON.parse(read('public/brand/shorts/manifest.json'));
    assert.equal(manifest.text, '장소아카이브 이끼');
    assert.equal(manifest.width, 1080);
    assert.equal(manifest.height, 1920);
    assert.equal(manifest.fps, 30);
    assert.equal(manifest.runtimeReplacement, false);
    for (const source of manifest.sources) assert.equal(hash(read(source.path)), source.sha256, source.path);
    assert.equal(manifest.assets.filter(asset => asset.type === 'video').length, 6);
    assert.equal(manifest.assets.filter(asset => asset.type === 'image').length, 16);
    assert.equal(manifest.assets.filter(asset => asset.type === 'preview').length, 3);
    for (const asset of manifest.assets) {
        assert.match(asset.path, /^[a-z0-9-]+\.(png|mp4|mov|gif)$/);
        const bytes = read(`public/brand/shorts/${asset.path}`);
        assert.equal(hash(bytes), asset.sha256, asset.path);
        assert.equal(bytes.length, asset.bytes);
        assert.ok(bytes.length < 25 * 1024 * 1024, asset.path);
        if (asset.type === 'video') {
            assert.equal(asset.width, 1080);
            assert.equal(asset.height, 1920);
            assert.equal(asset.fps, 30);
            assert.equal(asset.audio, false);
            assert.equal(asset.verification.frames, asset.duration * 30);
            if (asset.alpha) {
                assert.equal(asset.codec, 'ProRes 4444');
                assert.equal(asset.verification.alphaAtStart.visiblePixels, 0);
                assert.ok(asset.verification.alphaAtHold.visiblePixels > 1000);
                assert.ok(asset.verification.alphaAtHold.transparentPixels > 1000000);
                assert.equal(asset.verification.alphaAtEnd.visiblePixels, 0);
            } else assert.equal(asset.codec, 'H.264');
        }
    }
    const videos = manifest.assets.filter(asset => asset.type === 'video');
    assert.deepEqual(videos.map(asset => asset.duration).sort(), [3, 3, 3, 3, 4, 4]);
    assert.equal(videos.filter(asset => asset.alpha).length, 2);
    assert.equal(manifest.archives.length, 3);
    for (const archive of manifest.archives) {
        const bytes = read(`public/brand/shorts/${archive.path}`);
        assert.equal(hash(bytes), archive.sha256);
        assert.ok(bytes.length < 25 * 1024 * 1024);
        assert.equal(bytes.subarray(0, 4).toString('hex'), '504b0304');
    }
    assert.equal(hash(read(`public/brand/shorts/${manifest.preview.path}`)), manifest.preview.sha256);
});

test('shorts downloads remain standalone and playback does not autoplay large video files', () => {
    const html = read('public/brand/index.html').toString();
    assert.match(html, /id="shorts-kit"/);
    assert.match(html, /shorts\/intro-light\.mp4/);
    assert.match(html, /shorts\/outro-dark\.mp4/);
    assert.match(html, /shorts\/ikkyee-shorts-kit\.zip/);
    assert.match(html, /shorts\/ikkyee-shorts-alpha-teal\.zip/);
    assert.match(html, /shorts\/ikkyee-shorts-alpha-white\.zip/);
    assert.match(html, /class="shorts-video" controls playsinline preload="none"/);
    assert.doesNotMatch(html, /<video[^>]*autoplay/);
    assert.match(read('public/brand/shorts/guide.txt').toString(), /MP4.*투명/);
    for (const path of ['index.html', 'js/app.js']) assert.doesNotMatch(read(path).toString(), /brand\/shorts/);
});
