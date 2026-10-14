import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('the downloadable brand kit derives from the unchanged approved release', () => {
    const kit = JSON.parse(read('public/brand/manifest.json'));
    const approved = JSON.parse(read('brand/manifest.json'));
    assert.equal(kit.brandVersion, approved.version);
    assert.equal(kit.master, approved.master);
    assert.equal(kit.masterSha256, hash(read(approved.master)));
    assert.equal(kit.assets.length, 24);
    assert.deepEqual([...new Set(kit.assets.map(asset => asset.category))].sort(),
        ['app', 'logos', 'marketing', 'social', 'web']);
    for (const asset of kit.assets) {
        assert.match(asset.path, /^assets\/[a-z0-9/-]+\.png$/);
        assert.ok(!asset.path.includes('..'));
        const bytes = read(`public/brand/${asset.path}`);
        assert.equal(hash(bytes), asset.sha256, asset.path);
        assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(bytes.readUInt32BE(16), asset.width, asset.path);
        assert.equal(bytes.readUInt32BE(20), asset.height, asset.path);
        assert.equal(bytes[25], asset.alpha ? 6 : 2, asset.path);
        assert.ok(bytes.length <= 1024 * 1024, asset.path);
    }
    assert.equal(hash(read('public/brand/assets/logos/symbol-teal-1254.png')), kit.masterSha256);
    assert.equal(hash(read('public/brand/assets/app/app-store-1024.png')),
        hash(read('mobile/assets/app-icon.png')));
    assert.equal(hash(read('public/brand/assets/app/android-adaptive-foreground-1024.png')),
        hash(read('mobile/assets/app-icon-foreground.png')));
    assert.deepEqual(kit.fonts.map(font => font.family), ['Cormorant Garamond', 'NanumGothic']);
    for (const font of kit.fonts) {
        assert.equal(hash(read(font.path)), font.sha256);
        assert.match(read(font.license).toString(), /SIL OPEN FONT LICENSE/i);
    }
});

test('the kit includes store-safe icons, reusable logos and correctly sized marketing canvases', () => {
    const kit = JSON.parse(read('public/brand/manifest.json'));
    const get = path => kit.assets.find(asset => asset.path === `assets/${path}`);
    assert.equal(get('app/app-store-1024.png').alpha, false);
    assert.equal(get('app/google-play-512.png').transparent, false);
    assert.equal(get('app/google-play-512.png').width, 512);
    assert.equal(get('app/android-adaptive-foreground-1024.png').transparent, true);
    assert.equal(get('logos/lockup-horizontal-teal.png').transparent, true);
    assert.equal(get('logos/lockup-horizontal-white.png').transparent, true);
    for (const [path, width, height] of [
        ['marketing/link-preview-light.png', 1200, 630],
        ['marketing/feed-light.png', 1080, 1080],
        ['marketing/story-dark.png', 1080, 1920],
        ['marketing/google-play-feature.png', 1024, 500]
    ]) {
        assert.equal(get(path).width, width);
        assert.equal(get(path).height, height);
        assert.equal(get(path).transparent, false);
    }
    const zip = read('public/brand/ikkyee-brand-kit-v1.zip');
    assert.equal(zip.subarray(0, 4).toString('hex'), '504b0304');
    assert.equal(hash(zip), kit.archive.sha256);
    assert.equal(hash(read('public/brand/preview.png')), kit.preview.sha256);
});

test('brand kit preview and delivery guide are self-contained without changing runtime branding', () => {
    const html = read('public/brand/index.html').toString();
    assert.match(html, /lang="ko"/);
    assert.match(html, /ikkyee-brand-kit-v1\.zip/);
    assert.match(html, /assets\/logos\/lockup-horizontal-teal\.png/);
    assert.match(html, /max-width:\s*100%/);
    assert.doesNotMatch(html, /https:\/\/fonts\.|<script|<iframe/);
    const guide = read('public/brand/사용안내.txt').toString();
    assert.match(guide, /원본.*변경하지/);
    assert.match(guide, /벡터/);
    assert.match(guide, /다시 빌드/);
});
