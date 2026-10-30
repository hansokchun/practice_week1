import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';

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

test('the production build emits the generated map as an asset, not an unresolved source URL', async () => {
    const result = await build({ logLevel: 'silent', build: { write: false } });
    const outputs = (Array.isArray(result) ? result : [result]).flatMap(item => item.output);
    const artwork = outputs.find(item => item.type === 'asset' && /seoul-photo-map-v2-[\w-]+\.webp$/.test(item.fileName));
    assert.ok(artwork, 'Vite must copy and fingerprint the imported illustration');
    assert.ok(outputs.some(item => item.type === 'chunk' && item.code.includes(artwork.fileName)));
});
