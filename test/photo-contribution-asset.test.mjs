import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { build } from 'vite';

test('real photo credits retain each author and original licence outside the decorative map', () => {
    const provenance = JSON.parse(readFileSync(new URL('../images/contribution-real-photos.source.json', import.meta.url), 'utf8'));
    const credits = readFileSync(new URL('../public/artwork/photo-credits.html', import.meta.url), 'utf8');
    const stylesheet = readFileSync(new URL('../public/artwork/photo-credits.css', import.meta.url), 'utf8');
    assert.equal(provenance.photos.length, 3);
    for (const photo of provenance.photos) {
        assert.ok(credits.includes(photo.author));
        assert.ok(credits.includes(photo.source));
        assert.ok(credits.includes(photo.licenceUrl));
    }
    assert.match(credits, /<body class="artwork-credits">/);
    assert.match(stylesheet, /word-break: keep-all/);
    assert.match(stylesheet, /white-space: nowrap/);
    assert.match(stylesheet, /\.artwork-credits a:hover\s*\{[^}]*color: var\(--ink\)/s);
    assert.match(stylesheet, /\.artwork-credits a:active\s*\{[^}]*background: var\(--line\)/s);
});

const photographNames = ['bukchon', 'daeo', 'ihwa'];

function readWebpDimensions(bytes) {
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    for (let offset = 12; offset + 8 <= bytes.length;) {
        const type = bytes.toString('ascii', offset, offset + 4);
        const length = bytes.readUInt32LE(offset + 4);
        if (type === 'VP8X') {
            return { width: bytes.readUIntLE(offset + 12, 3) + 1, height: bytes.readUIntLE(offset + 15, 3) + 1 };
        }
        if (type === 'VP8 ') {
            return { width: bytes.readUInt16LE(offset + 14) & 0x3fff, height: bytes.readUInt16LE(offset + 16) & 0x3fff };
        }
        if (type === 'VP8L') {
            const dimensions = bytes.readUInt32LE(offset + 9);
            return { width: (dimensions & 0x3fff) + 1, height: ((dimensions >>> 14) & 0x3fff) + 1 };
        }
        offset += 8 + length + (length % 2);
    }
    assert.fail('the WebP must contain image dimensions');
}

test('the Seoul contribution illustration preserves alpha and stays within its image budget', () => {
    const bytes = readFileSync(new URL('../images/seoul-photo-map-v2.webp', import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.equal(bytes.toString('ascii', 12, 16), 'VP8X');
    assert.ok(bytes[20] & 0x10, 'preserve the generated transparent background');
    assert.equal(bytes.readUIntLE(24, 3) + 1, 1152);
    assert.equal(bytes.readUIntLE(27, 3) + 1, 768);
    assert.ok(bytes.length <= 250 * 1024, 'a below-fold decoration must remain under 250 KiB');
});

test('three small real photographs keep the whole map decoration within its existing budget', () => {
    const original = readFileSync(new URL('../images/seoul-photo-map-v2.webp', import.meta.url));
    assert.equal(original.length, 227074, 'keep the existing map illustration unchanged');
    assert.equal(createHash('sha256').update(original).digest('hex'), '8e8439905aad9f96bf3e47ed3cc71fdd5e77ed648adc99732018ba9d8a8820a6');
    const photographs = photographNames.map(place => readFileSync(new URL(`../images/contribution-${place}.webp`, import.meta.url)));
    for (const photograph of photographs) {
        assert.deepEqual(readWebpDimensions(photograph), { width: 160, height: 120 });
    }
    assert.equal(new Set(photographs.map(bytes => createHash('sha256').update(bytes).digest('hex'))).size, 3, 'each frame must use a different photograph');
    assert.ok(photographs.reduce((total, bytes) => total + bytes.length, original.length) <= 250 * 1024, 'the map and three overlays together must remain under 250 KiB');
});

test('the production build emits the original map and real photographs as resolved assets', async () => {
    const result = await build({ logLevel: 'silent', build: { write: false } });
    const outputs = (Array.isArray(result) ? result : [result]).flatMap(item => item.output);
    const artwork = outputs.find(item => item.type === 'asset' && /seoul-photo-map-v2-[\w-]+\.webp$/.test(item.fileName));
    assert.ok(artwork, 'Vite must copy and fingerprint the imported illustration');
    assert.ok(outputs.some(item => item.type === 'chunk' && item.code.includes(artwork.fileName)));
    for (const place of photographNames) {
        const photograph = outputs.find(item => item.type === 'asset' && new RegExp(`contribution-${place}-[\\w-]+\\.webp$`).test(item.fileName));
        assert.ok(photograph, `Vite must copy and fingerprint the ${place} photograph`);
        assert.ok(outputs.some(item => item.type === 'chunk' && item.code.includes(photograph.fileName)));
    }
});
