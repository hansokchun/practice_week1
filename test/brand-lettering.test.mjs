import assert from 'node:assert/strict';
import test from 'node:test';
import { renderBrandLettering } from '../scripts/brand-lettering.mjs';

const path = { commands: [{}], toSVG: () => 'M0 0L100 0L100 200Z' };
const glyph = { id: 1, path, bbox: { minX: -10, maxX: 100, minY: -20, maxY: 200 } };
const space = { id: 2, path: { commands: [], toSVG: () => '' } };
const positions = advances => advances.map(xAdvance => ({ xAdvance, xOffset: 0, yOffset: 0 }));
const sharp = bytes => ({ png: () => ({ toBuffer: async () => bytes }) });

test('brand lettering keeps a real word gap and accounts for negative glyph bounds', async () => {
    const font = { unitsPerEm: 1000, layout: () => ({
        glyphs: [glyph, space, glyph], positions: positions([120, 80, 120])
    }) };
    const result = await renderBrandLettering(font, 'A A', 100, '#245457', sharp);
    assert.equal(result.width, 35);
    assert.equal(result.height, 26);
    assert.match(result.bytes.toString(), /translate\(200 0\)/);
    assert.match(result.bytes.toString(), /translate\(3 22\) scale\(0.1 -0.1\)/);
    assert.equal((result.bytes.toString().match(/<path /g) || []).length, 2);
});

test('brand lettering rejects missing glyphs, empty artwork and invalid sizing', async () => {
    const missing = { unitsPerEm: 1000, layout: () => ({ glyphs: [{ ...glyph, id: 0 }], positions: positions([120]) }) };
    await assert.rejects(renderBrandLettering(missing, 'A', 100, '#245457', sharp), /Missing glyph/);
    const empty = { unitsPerEm: 1000, layout: () => ({ glyphs: [space], positions: positions([80]) }) };
    await assert.rejects(renderBrandLettering(empty, ' ', 100, '#245457', sharp), /visible glyphs/);
    await assert.rejects(renderBrandLettering(empty, 'A', NaN, '#245457', sharp), /positive/);
});
