import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE_PATH || 'sharp');
const fontkit = require(process.env.FONTKIT_MODULE_PATH || 'fontkit');
const JSZip = require(process.env.JSZIP_MODULE_PATH || 'jszip');
const root = new URL('../', import.meta.url);
const output = new URL('public/brand/archive-logo/', root);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const kit = JSON.parse(await readFile(new URL('public/brand/manifest.json', root)));
const fontDefinition = kit.fonts.find(font => font.family === 'NanumGothic');
const fontBytes = await readFile(new URL(fontDefinition.path, root));
if (hash(fontBytes) !== fontDefinition.sha256) throw new Error('The approved Korean font changed.');
const font = fontkit.create(fontBytes);
const caption = '장소아카이브';
const width = 2100;
const height = 600;
const preservedRegion = { left: 0, top: 0, width: 1390, height };
const sources = [];
const assets = [];
await mkdir(output, { recursive: true });

async function lettering(color) {
    const run = font.layout(caption);
    const scale = (100 * 1220 / 1400) / font.unitsPerEm;
    const bounds = { left: Infinity, right: -Infinity, top: -Infinity, bottom: Infinity };
    let pen = 0;
    const paths = run.glyphs.map((glyph, index) => {
        if (!glyph.id) throw new Error(`Missing Korean glyph: ${caption}`);
        const position = run.positions[index];
        const x = pen + position.xOffset;
        const y = position.yOffset;
        pen += position.xAdvance;
        bounds.left = Math.min(bounds.left, x + glyph.bbox.minX);
        bounds.right = Math.max(bounds.right, x + glyph.bbox.maxX);
        bounds.top = Math.max(bounds.top, y + glyph.bbox.maxY);
        bounds.bottom = Math.min(bounds.bottom, y + glyph.bbox.minY);
        return `<path transform="translate(${x} ${y})" d="${glyph.path.toSVG()}"/>`;
    }).join('');
    const textWidth = Math.ceil((bounds.right - bounds.left) * scale) + 4;
    const textHeight = Math.ceil((bounds.top - bounds.bottom) * scale) + 4;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${textWidth}" height="${textHeight}"><g fill="${color}" transform="translate(${2 - bounds.left * scale} ${2 + bounds.top * scale}) scale(${scale} ${-scale})">${paths}</g></svg>`;
    return { bytes: await sharp(Buffer.from(svg)).png().toBuffer(), width: textWidth, height: textHeight };
}

async function deliver(path, bytes, tone, transparent, preservedPixelsSha256) {
    await writeFile(new URL(path, output), bytes);
    assets.push({ path, width, height, tone, transparent, sha256: hash(bytes),
        ...(preservedPixelsSha256 ? { preservedPixelsSha256 } : {}) });
}

for (const [tone, color, background] of [
    ['teal', kit.colors.teal, kit.colors.light],
    ['white', kit.colors.white, kit.colors.dark]
]) {
    const approved = kit.assets.find(asset => asset.path === `assets/logos/lockup-horizontal-${tone}.png`);
    const path = `public/brand/${approved.path}`;
    const source = await readFile(new URL(path, root));
    if (hash(source) !== approved.sha256) throw new Error(`Unapproved lockup: ${path}`);
    const prefix = await sharp(source).extract(preservedRegion).ensureAlpha().raw().toBuffer();
    const text = await lettering(color);
    if (1403 + text.width > width - 100) throw new Error('Caption exceeds its canvas.');
    const pixels = await sharp({ create: { width, height, channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([
        { input: text.bytes, left: 1403, top: Math.round((height - text.height) / 2) }
    ]).raw().toBuffer();
    // Copy approved pixels after rendering so alpha compositing cannot change the symbol or wordmark.
    for (let row = 0; row < height; row += 1) {
        prefix.copy(pixels, row * width * 4, row * preservedRegion.width * 4,
            (row + 1) * preservedRegion.width * 4);
    }
    const bytes = await sharp(pixels, { raw: { width, height, channels: 4 } })
        .png({ compressionLevel: 9 }).toBuffer();
    const exportedPrefix = await sharp(bytes).extract(preservedRegion).raw().toBuffer();
    if (!prefix.equals(exportedPrefix)) throw new Error('Approved logo pixels were altered.');
    const preservedPixelsSha256 = hash(exportedPrefix);
    sources.push({ path, tone, sha256: approved.sha256, preservedPixelsSha256 });
    await deliver(`lockup-${tone}.png`, bytes, tone, true, preservedPixelsSha256);
    await deliver(`preview-${tone === 'teal' ? 'light' : 'dark'}.png`,
        await sharp(bytes).flatten({ background }).removeAlpha().png({ compressionLevel: 9 }).toBuffer(),
        tone, false);
}

const manifest = { version: '1.0', caption, runtimeReplacement: false,
    font: fontDefinition, sources, preservedRegion, assets };
const zip = new JSZip();
const date = new Date('2026-10-15T00:00:00Z');
for (const asset of assets) zip.file(asset.path, await readFile(new URL(asset.path, output)), { date });
zip.file('manifest.json', JSON.stringify(manifest, null, 2), { date });
zip.file('guide.txt', await readFile(new URL('guide.txt', output)), { date });
zip.file('NanumGothic-OFL.txt', await readFile(new URL(fontDefinition.license, root)), { date });
const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE',
    compressionOptions: { level: 9 } });
await writeFile(new URL('ikkyee-archive-logo.zip', output), archive);
await writeFile(new URL('manifest.json', output), JSON.stringify({ ...manifest,
    archive: { path: 'ikkyee-archive-logo.zip', bytes: archive.length, sha256: hash(archive) }
}, null, 2) + '\n');
console.log(`Exported ${assets.length} archive-caption variants without changing the approved logo.`);
