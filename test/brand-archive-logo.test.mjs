import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('the archive-caption logo is a separate variant of the approved artwork', () => {
    const manifest = JSON.parse(read('public/brand/archive-logo/manifest.json'));
    const kit = JSON.parse(read('public/brand/manifest.json'));
    assert.equal(manifest.caption, '장소아카이브');
    assert.equal(manifest.runtimeReplacement, false);
    assert.equal(manifest.font.family, 'NanumGothic');
    assert.equal(manifest.font.sha256, hash(read(manifest.font.path)));
    assert.equal(manifest.sources.length, 2);
    for (const source of manifest.sources) {
        assert.equal(source.sha256, hash(read(source.path)));
        assert.equal(source.sha256, kit.assets.find(asset => `public/brand/${asset.path}` === source.path).sha256);
    }
    assert.deepEqual(manifest.preservedRegion, { left: 0, top: 0, width: 1390, height: 600 });
    assert.equal(manifest.assets.length, 4);
    for (const asset of manifest.assets) {
        assert.match(asset.path, /^[a-z0-9-]+\.png$/);
        const bytes = read(`public/brand/archive-logo/${asset.path}`);
        assert.equal(hash(bytes), asset.sha256, asset.path);
        assert.equal(bytes.readUInt32BE(16), 2100, asset.path);
        assert.equal(bytes.readUInt32BE(20), 600, asset.path);
        assert.equal(bytes[25], asset.transparent ? 6 : 2, asset.path);
        assert.ok(bytes.length < 300 * 1024, asset.path);
        if (asset.transparent) assert.equal(asset.preservedPixelsSha256,
            manifest.sources.find(source => source.tone === asset.tone).preservedPixelsSha256);
    }
    assert.equal(manifest.assets.filter(asset => asset.transparent).length, 2);
    const archive = read(`public/brand/archive-logo/${manifest.archive.path}`);
    assert.equal(archive.subarray(0, 4).toString('hex'), '504b0304');
    assert.equal(hash(archive), manifest.archive.sha256);
});

test('the archive-caption variant is downloadable without replacing the service logo', () => {
    const html = read('public/brand/index.html').toString();
    assert.match(html, /id="archive-logo"/);
    assert.match(html, /archive-logo\/ikkyee-archive-logo\.zip/);
    assert.match(html, /archive-logo\/lockup-teal\.png/);
    assert.match(html, /archive-logo\/lockup-white\.png/);
    assert.match(html, /alt="Ikkyee 장소아카이브"/);
    for (const path of ['index.html', 'js/app.js', 'style.css']) {
        assert.doesNotMatch(read(path).toString(), /archive-logo\/lockup/);
    }
    assert.match(read('brand/ARCHIVE-LOGO.md').toString(), /separate variant/);
});
