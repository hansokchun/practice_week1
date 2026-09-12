import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE_PATH || 'sharp');
const root = new URL('../', import.meta.url);
const master = 'brand/ikkyee-symbol-v1.png';
const source = await readFile(new URL(master, root));
const metadata = await sharp(source).metadata();
if (!metadata.hasAlpha || metadata.width !== metadata.height) {
    throw new Error('The approved master must be a square transparent PNG.');
}

const outputs = [
    { path: 'images/logo.png', size: 256 },
    { path: 'mobile/assets/brand-logo.png', size: 1024 },
    { path: 'mobile/assets/favicon.png', size: 512 },
    { path: 'mobile/assets/app-icon-foreground.png', size: 1024, inset: 112 },
    { path: 'mobile/assets/app-icon.png', size: 1024, opaque: true }
];
const assets = [];
async function record(path) {
    const bytes = await readFile(new URL(path, root));
    const info = await sharp(bytes).metadata();
    assets.push({ path, width: info.width, height: info.height, alpha: info.hasAlpha,
        sha256: createHash('sha256').update(bytes).digest('hex') });
}
await record(master);
for (const output of outputs) {
    const inset = output.inset || 0;
    let pipeline = sharp(source).resize(output.size - inset * 2, output.size - inset * 2);
    if (inset) pipeline = pipeline.extend({ top: inset, bottom: inset, left: inset, right: inset,
        background: { r: 0, g: 0, b: 0, alpha: 0 } });
    if (output.opaque) pipeline = pipeline.flatten({ background: '#F9F7F2' }).removeAlpha();
    else pipeline = pipeline.ensureAlpha();
    await pipeline.png({ compressionLevel: 9, palette: false }).toFile(fileURLToPath(new URL(output.path, root)));
    await record(output.path);
}
await writeFile(new URL('brand/manifest.json', root), JSON.stringify({
    version: '1.0', master, assets
}, null, 2) + '\n');
console.log('Exported and fingerprinted the approved Ikkyee brand assets.');
