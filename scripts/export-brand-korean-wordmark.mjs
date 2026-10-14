import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { renderBrandLettering } from './brand-lettering.mjs';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE_PATH || 'sharp');
const fontkit = require(process.env.FONTKIT_MODULE_PATH || 'fontkit');
const JSZip = require(process.env.JSZIP_MODULE_PATH || 'jszip');
const root = new URL('../', import.meta.url);
const output = new URL('public/brand/korean-wordmark/', root);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const approved = JSON.parse(await readFile(new URL('brand/manifest.json', root)));
const kit = JSON.parse(await readFile(new URL('public/brand/manifest.json', root)));
const sourceDefinition = approved.assets.find(asset => asset.path === approved.master);
const source = await readFile(new URL(sourceDefinition.path, root));
const fontDefinition = kit.fonts.find(font => font.family === 'NanumGothic');
const fontBytes = await readFile(new URL(fontDefinition.path, root));
if (hash(source) !== sourceDefinition.sha256) throw new Error('The approved brand master changed.');
if (hash(fontBytes) !== fontDefinition.sha256) throw new Error('The approved Korean font changed.');
const font = fontkit.create(fontBytes);
const text = '장소아카이브 이끼';
const width = 1800;
const height = 440;
const alpha = await sharp(source).extractChannel('alpha').png().toBuffer();
const white = await sharp({ create: { width: 1254, height: 1254, channels: 3,
    background: kit.colors.white } }).joinChannel(alpha).png().toBuffer();
const assets = [];
await mkdir(output, { recursive: true });

async function deliver(path, bytes, tone, transparent) {
    await writeFile(new URL(path, output), bytes);
    assets.push({ path, width, height, tone, transparent, sha256: hash(bytes) });
}

for (const [tone, color, background] of [
    ['teal', kit.colors.teal, kit.colors.light], ['white', kit.colors.white, kit.colors.dark]
]) {
    const lettering = await renderBrandLettering(font, text, 160, color, sharp);
    if (420 + lettering.width > width - 100 || lettering.height > height - 80) {
        throw new Error('Korean wordmark exceeds its fixed canvas.');
    }
    const symbol = await sharp(tone === 'white' ? white : source).resize(400, 400).png().toBuffer();
    const bytes = await sharp({ create: { width, height, channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([
        { input: symbol, left: 0, top: 20 },
        { input: lettering.bytes, left: 420, top: Math.round((height - lettering.height) / 2) }
    ]).png({ compressionLevel: 9 }).toBuffer();
    await deliver(`lockup-${tone}.png`, bytes, tone, true);
    await deliver(`preview-${tone === 'teal' ? 'light' : 'dark'}.png`,
        await sharp(bytes).flatten({ background }).removeAlpha().png({ compressionLevel: 9 }).toBuffer(),
        tone, false);
}

const manifest = { version: '1.0', text, runtimeReplacement: false,
    source: { path: sourceDefinition.path, sha256: sourceDefinition.sha256 }, font: fontDefinition, assets };
const zip = new JSZip();
const date = new Date('2026-10-15T00:00:00Z');
for (const asset of assets) zip.file(asset.path, await readFile(new URL(asset.path, output)), { date });
zip.file('manifest.json', JSON.stringify(manifest, null, 2), { date });
zip.file('guide.txt', await readFile(new URL('guide.txt', output)), { date });
zip.file('NanumGothic-OFL.txt', await readFile(new URL(fontDefinition.license, root)), { date });
const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE',
    compressionOptions: { level: 9 } });
await writeFile(new URL('ikkyee-korean-wordmark.zip', output), archive);
await writeFile(new URL('manifest.json', output), JSON.stringify({ ...manifest,
    archive: { path: 'ikkyee-korean-wordmark.zip', bytes: archive.length, sha256: hash(archive) }
}, null, 2) + '\n');
console.log(`Exported ${assets.length} Korean wordmark variants from the unchanged approved symbol.`);
