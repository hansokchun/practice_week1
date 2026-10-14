import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('the Korean wordmark uses the exact requested phrase and approved leaf symbol', () => {
    const manifest = JSON.parse(read('public/brand/korean-wordmark/manifest.json'));
    const approved = JSON.parse(read('brand/manifest.json'));
    const kit = JSON.parse(read('public/brand/manifest.json'));
    assert.equal(manifest.text, '장소아카이브 이끼');
    assert.equal(manifest.runtimeReplacement, false);
    assert.equal(manifest.source.path, approved.master);
    assert.equal(manifest.source.sha256, hash(read(approved.master)));
    assert.equal(manifest.font.path, 'brand/fonts/NanumGothic-Bold.ttf');
    assert.equal(manifest.font.sha256, kit.fonts.find(font => font.family === 'NanumGothic').sha256);
    assert.equal(hash(read(manifest.font.path)), manifest.font.sha256);
    assert.equal(manifest.assets.length, 4);
    for (const asset of manifest.assets) {
        assert.match(asset.path, /^[a-z0-9-]+\.png$/);
        const bytes = read(`public/brand/korean-wordmark/${asset.path}`);
        assert.equal(hash(bytes), asset.sha256, asset.path);
        assert.equal(bytes.readUInt32BE(16), 1800, asset.path);
        assert.equal(bytes.readUInt32BE(20), 440, asset.path);
        assert.equal(bytes[25], asset.transparent ? 6 : 2, asset.path);
        assert.ok(bytes.length < 300 * 1024, asset.path);
    }
    assert.equal(manifest.assets.filter(asset => asset.transparent).length, 2);
    const archive = read(`public/brand/korean-wordmark/${manifest.archive.path}`);
    assert.equal(archive.subarray(0, 4).toString('hex'), '504b0304');
    assert.equal(hash(archive), manifest.archive.sha256);
});

test('the Korean phrase logo is previewed separately without changing runtime branding', () => {
    const html = read('public/brand/index.html').toString();
    assert.match(html, /id="korean-wordmark"/);
    assert.match(html, /alt="장소아카이브 이끼"/);
    assert.match(html, /korean-wordmark\/ikkyee-korean-wordmark\.zip/);
    assert.match(html, /korean-wordmark\/lockup-teal\.png/);
    assert.match(html, /korean-wordmark\/lockup-white\.png/);
    for (const path of ['index.html', 'js/app.js', 'style.css']) {
        assert.doesNotMatch(read(path).toString(), /korean-wordmark\/lockup/);
    }
});
