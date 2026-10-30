import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';

const assetFiles = [
    'seoul-photo-map-v3.svg',
    'seoul-namsan-sprite-v1.webp',
    'contribution-daeo.webp',
    'contribution-bukchon.webp',
    'contribution-ihwa.webp'
];

function readWebp(name) {
    const bytes = readFileSync(new URL(`../images/${name}`, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    const format = bytes.toString('ascii', 12, 16);
    if (format === 'VP8X') {
        return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1, alpha: Boolean(bytes[20] & 0x10) };
    }
    if (format === 'VP8L') {
        const dimensions = bytes.readUInt32LE(21);
        return { width: (dimensions & 0x3fff) + 1, height: ((dimensions >>> 14) & 0x3fff) + 1, alpha: Boolean(dimensions & 0x10000000) };
    }
    assert.equal(format, 'VP8 ');
    assert.equal(bytes.toString('hex', 23, 26), '9d012a');
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff, alpha: false };
}

test('the native Seoul floor remains transparent vector geography with no embedded bitmap', () => {
    const floor = readFileSync(new URL('../images/seoul-photo-map-v3.svg', import.meta.url), 'utf8');
    assert.match(floor, /<svg\b[^>]*viewBox="0 0 1152 768"/);
    assert.match(floor, /<path\b/);
    assert.doesNotMatch(floor, /<image\b|data:image\/|<script\b/);
});

test('the Namsan sprite retains transparency and all real photos keep their full 4:3 frame', () => {
    const sprite = readWebp('seoul-namsan-sprite-v1.webp');
    assert.ok(sprite.alpha, 'retain the transparent cutout around the 3D landmark');
    assert.equal(sprite.width / sprite.height, 36 / 35);
    assert.ok(sprite.width >= 300 && sprite.width <= 600);
    for (const name of assetFiles.slice(2)) {
        const photo = readWebp(name);
        assert.equal(photo.width / photo.height, 4 / 3, `${name} must preserve the sourced full frame`);
    }
});

test('the complete below-fold composition stays within one 250 KiB asset budget', () => {
    const total = assetFiles.reduce((sum, name) => sum + readFileSync(new URL(`../images/${name}`, import.meta.url)).length, 0);
    assert.ok(total <= 250 * 1024, `the floor, sprite and three photos total ${total} bytes`);
});

test('the production build fingerprints and references every native artwork layer', async () => {
    const result = await build({ logLevel: 'silent', build: { write: false } });
    const outputs = (Array.isArray(result) ? result : [result]).flatMap(item => item.output);
    for (const name of assetFiles) {
        const [stem, extension] = name.split('.');
        const artwork = outputs.find(item => item.type === 'asset' && item.fileName.includes(`${stem}-`) && item.fileName.endsWith(`.${extension}`));
        assert.ok(artwork, `Vite must copy and fingerprint ${name}`);
        assert.ok(outputs.some(item => item.type === 'chunk' && item.code.includes(artwork.fileName)));
    }
    assert.ok(!outputs.some(item => item.type === 'asset' && item.fileName.includes('seoul-photo-map-v2-')));
    assert.ok(!outputs.some(item => item.type === 'asset' && item.fileName.includes('central-seoul-map-data')), 'source geography is downloadable evidence, not a runtime dependency');
});
