import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { WORDMARK_V2, getWordmarkV2Layout } from '../scripts/brand-wordmark-v2.mjs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const metrics = { brand: { width: 380, height: 204 }, descriptor: { width: 330, height: 54 } };

test('wordmark layouts preserve the full symbol frame and separate all visible layers', () => {
    for (const variant of ['horizontal', 'stacked', 'compact']) {
        const layout = getWordmarkV2Layout(variant, variant === 'compact'
            ? { ...metrics, brand: { width: 210, height: 112 } } : metrics);
        const { symbol, brand, descriptor, width, height } = layout;
        for (const box of [symbol, brand, descriptor].filter(Boolean)) {
            assert.ok(box.x >= 0 && box.y >= 0, variant);
            assert.ok(box.x + box.width <= width && box.y + box.height <= height, variant);
        }
        if (variant === 'stacked') {
            assert.ok(brand.y >= layout.symbolArtwork.y + layout.symbolArtwork.height + 30);
            assert.ok(descriptor.y >= brand.y + brand.height + 20);
        } else {
            assert.ok(brand.x >= layout.symbolArtwork.x + layout.symbolArtwork.width + 20);
            if (descriptor) assert.ok(brand.y >= descriptor.y + descriptor.height + 20);
        }
    }
    assert.equal(getWordmarkV2Layout('compact', {
        ...metrics, brand: { width: 210, height: 112 }
    }).descriptor, null);
    assert.throws(() => getWordmarkV2Layout('unknown', metrics), /Unknown/);
    assert.throws(() => getWordmarkV2Layout('horizontal', {
        ...metrics, brand: { width: 3000, height: 204 }
    }), /canvas/);
});

test('the new reusable kit fingerprints the approved symbol and outlined lettering', () => {
    const manifest = JSON.parse(read('public/brand/wordmark-v2/manifest.json'));
    assert.equal(manifest.text, '이끼 · 장소 저장소');
    assert.equal(WORDMARK_V2.name, '이끼');
    assert.equal(WORDMARK_V2.descriptor, '장소 저장소');
    assert.equal(manifest.runtimeReplacement, false);
    assert.equal(manifest.source.sha256, hash(read('brand/ikkyee-symbol-v1.png')));
    assert.equal(manifest.source.sha256,
        JSON.parse(read('brand/manifest.json')).assets[0].sha256);
    assert.deepEqual(manifest.variants.map(item => item.id), ['horizontal', 'stacked', 'compact']);
    for (const font of manifest.fonts) assert.equal(hash(read(font.path)), font.sha256);
    assert.match(read('brand/fonts/Pretendard-LICENSE.txt').toString(), /SIL OPEN FONT LICENSE/);
    assert.equal(manifest.assets.length, 18);
    for (const asset of manifest.assets) {
        const bytes = read(`public/brand/wordmark-v2/${asset.path}`);
        assert.equal(hash(bytes), asset.sha256, asset.path);
        if (asset.format === 'png') {
            assert.equal(bytes.readUInt32BE(16), asset.width);
            assert.equal(bytes.readUInt32BE(20), asset.height);
            assert.equal(bytes[25], 6, asset.path);
        } else {
            const svg = bytes.toString();
            assert.match(svg, /<path /);
            assert.match(svg, /data:image\/png;base64,/);
            assert.doesNotMatch(svg, /<text\b|<script\b|<foreignObject\b|href="https?:/);
            assert.match(svg, /<title[^>]*>이끼 · 장소 저장소<\/title>/);
        }
    }
    const archive = read(`public/brand/wordmark-v2/${manifest.archive.path}`);
    assert.equal(archive.subarray(0, 4).toString('hex'), '504b0304');
    assert.equal(hash(archive), manifest.archive.sha256);
    assert.ok(archive.length < 25 * 1024 * 1024);
    assert.equal(WORDMARK_V2.colors.teal, '#245457');
});

test('the brand downloads page presents wordmark v2 as current and labels earlier kits as legacy', () => {
    const html = read('public/brand/index.html').toString();
    assert.match(html, /id="wordmark-v2"/);
    assert.match(html, /wordmark-v2\/ikkyee-wordmark-v2\.zip/);
    assert.match(html, /wordmark-v2\/horizontal-teal\.png/);
    assert.match(html, /wordmark-v2\/stacked-teal\.png/);
    assert.match(html, /wordmark-v2\/compact-teal\.png/);
    assert.match(html, /이끼 · 장소 저장소/);
    assert.match(html, /이전 브랜드 자료/);
    assert.match(html, /현재 마케팅에 사용하지 마세요/);
    assert.match(html, /id="brand-kit-v1" class="legacy"/);
    assert.match(html, /id="marketing-v1" class="legacy"/);
});
