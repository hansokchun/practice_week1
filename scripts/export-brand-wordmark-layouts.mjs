import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { getWordmarkLayout } from './brand-wordmark-layouts.mjs';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE_PATH || 'sharp');
const JSZip = require(process.env.JSZIP_MODULE_PATH || 'jszip');
const root = new URL('../', import.meta.url);
const output = new URL('public/brand/korean-wordmark-layouts/', root);
const original = JSON.parse(await readFile(new URL('public/brand/korean-wordmark/manifest.json', root)));
const kit = JSON.parse(await readFile(new URL('public/brand/manifest.json', root)));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const width = 1800;
const height = 440;
const raw = { width, height, channels: 4 };
const layouts = [{ id: 'close-left', side: 'left', gap: 24 },
    { id: 'close-right', side: 'right', gap: 24 }];
const sources = [];
const assets = [];
await mkdir(output, { recursive: true });

function alphaBounds(pixels, layerWidth) {
    let left = layerWidth;
    let top = height;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < height; y += 1) for (let x = 0; x < layerWidth; x += 1) {
        if (!pixels[(y * layerWidth + x) * 4 + 3]) continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
    }
    if (right < left) throw new Error('Logo layer contains no artwork.');
    return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function copyLayer(canvas, pixels, layerWidth, left) {
    if (left < 0 || left + layerWidth > width) throw new Error('Logo layer exceeds canvas bounds.');
    // Move original RGBA pixels directly without resampling, mirroring or compositing changes.
    for (let y = 0; y < height; y += 1) for (let x = 0; x < layerWidth; x += 1) {
        const source = (y * layerWidth + x) * 4;
        if (!pixels[source + 3]) continue;
        const target = (y * width + left + x) * 4;
        if (canvas[target + 3]) throw new Error('Logo artwork overlaps lettering.');
        pixels.copy(canvas, target, source, source + 4);
    }
}

const contentHash = async (pixels, layerWidth, bounds) => hash(await sharp(pixels,
    { raw: { width: layerWidth, height, channels: 4 } }).extract(bounds).raw().toBuffer());

async function deliver(path, bytes, tone, layout, transparent, contentHashes) {
    await writeFile(new URL(path, output), bytes);
    assets.push({ path, width, height, tone, layout, transparent, sha256: hash(bytes),
        ...(contentHashes ? { contentHashes } : {}) });
}

for (const tone of ['teal', 'white']) {
    const approved = original.assets.find(asset => asset.path === `lockup-${tone}.png`);
    const path = `public/brand/korean-wordmark/${approved.path}`;
    const bytes = await readFile(new URL(path, root));
    if (hash(bytes) !== approved.sha256) throw new Error(`Original wordmark changed: ${path}`);
    const symbol = await sharp(bytes).extract({ left: 0, top: 0, width: 400, height }).raw().toBuffer();
    const lettering = await sharp(bytes).extract({ left: 420, top: 0, width: 1380, height }).raw().toBuffer();
    const symbolBounds = alphaBounds(symbol, 400);
    const textBounds = alphaBounds(lettering, 1380);
    const contentHashes = { symbol: await contentHash(symbol, 400, symbolBounds),
        lettering: await contentHash(lettering, 1380, textBounds) };
    sources.push({ path, tone, sha256: approved.sha256, contentHashes });
    for (const layout of layouts) {
        const placement = getWordmarkLayout({ width, symbol: symbolBounds, lettering: textBounds,
            gap: layout.gap, side: layout.side });
        const canvas = Buffer.alloc(width * height * 4);
        copyLayer(canvas, symbol, 400, placement.symbolLeft);
        copyLayer(canvas, lettering, 1380, placement.textLeft);
        const exportedHashes = {
            symbol: await contentHash(canvas, width, { ...symbolBounds, left: symbolBounds.left + placement.symbolLeft }),
            lettering: await contentHash(canvas, width, { ...textBounds, left: textBounds.left + placement.textLeft })
        };
        if (JSON.stringify(exportedHashes) !== JSON.stringify(contentHashes)) {
            throw new Error('Layout export changed the original artwork pixels.');
        }
        const png = await sharp(canvas, { raw }).png({ compressionLevel: 9 }).toBuffer();
        await deliver(`${layout.id}-${tone}.png`, png, tone, layout.id, true, exportedHashes);
        const background = tone === 'teal' ? kit.colors.light : kit.colors.dark;
        await deliver(`${layout.id}-preview-${tone === 'teal' ? 'light' : 'dark'}.png`,
            await sharp(png).flatten({ background }).removeAlpha().png({ compressionLevel: 9 }).toBuffer(),
            tone, layout.id, false);
    }
}

const manifest = { version: '1.0', text: original.text, runtimeReplacement: false, layouts, sources, assets };
const zip = new JSZip();
const date = new Date('2026-10-15T00:00:00Z');
for (const asset of assets) zip.file(asset.path, await readFile(new URL(asset.path, output)), { date });
zip.file('manifest.json', JSON.stringify(manifest, null, 2), { date });
zip.file('guide.txt', await readFile(new URL('guide.txt', output)), { date });
zip.file('NanumGothic-OFL.txt', await readFile(new URL(original.font.license, root)), { date });
const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
await writeFile(new URL('ikkyee-wordmark-layouts.zip', output), archive);
await writeFile(new URL('manifest.json', output), JSON.stringify({ ...manifest,
    archive: { path: 'ikkyee-wordmark-layouts.zip', bytes: archive.length, sha256: hash(archive) }
}, null, 2) + '\n');
console.log(`Exported ${layouts.length} wordmark placements; symbol and lettering pixels are unchanged.`);
