import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);

test('approved brand master and every delivery asset stay locked to one release', () => {
    const manifest = JSON.parse(readFileSync(new URL('brand/manifest.json', root), 'utf8'));
    assert.equal(manifest.version, '1.0');
    assert.equal(manifest.master, 'brand/ikkyee-symbol-v1.png');
    for (const asset of manifest.assets) {
        const bytes = readFileSync(new URL(asset.path, root));
        assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.path);
        assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(bytes.readUInt32BE(16), asset.width, asset.path);
        assert.equal(bytes.readUInt32BE(20), asset.height, asset.path);
        assert.equal(bytes[25], asset.alpha ? 6 : 2, asset.path);
    }
    assert.equal(manifest.assets.length, 6);
});

test('header logo keeps intrinsic dimensions and is not clipped into a circle', () => {
    const html = readFileSync(new URL('index.html', root), 'utf8');
    const css = readFileSync(new URL('style.css', root), 'utf8');
    assert.match(html, /<img src="images\/logo.png" alt="" width="256" height="256">/);
    assert.doesNotMatch(css, /body\[data-page="landing"\] \.brand img\s*\{[^}]*border-radius:\s*50%/);
});
