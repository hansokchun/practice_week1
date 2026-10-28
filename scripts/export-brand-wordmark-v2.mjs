import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { WORDMARK_V2 as design, getWordmarkV2Layout } from './brand-wordmark-v2.mjs';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE_PATH || 'sharp');
const fontkit = require(process.env.FONTKIT_MODULE_PATH || 'fontkit');
const JSZip = require(process.env.JSZIP_MODULE_PATH || 'jszip');
const root = new URL('../', import.meta.url);
const output = new URL('public/brand/wordmark-v2/', root);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const approved = JSON.parse(await readFile(new URL('brand/manifest.json', root)));
const source = await readFile(new URL(approved.master, root));
const sourceDefinition = approved.assets.find(asset => asset.path === approved.master);
if (hash(source) !== sourceDefinition.sha256) throw new Error('The approved master changed.');
const fonts = [];
for (const [weight, name] of [[500, 'Medium'], [600, 'SemiBold']]) {
    const path = `brand/fonts/Pretendard-${name}.otf`;
    const bytes = await readFile(new URL(path, root));
    fonts.push({ family: 'Pretendard', weight, path, sha256: hash(bytes),
        license: 'brand/fonts/Pretendard-LICENSE.txt', font: fontkit.create(bytes) });
}
const medium = fonts.find(font => font.weight === 500).font;
const semibold = fonts.find(font => font.weight === 600).font;
const alpha = await sharp(source).extractChannel('alpha').png().toBuffer();
const whiteSource = await sharp({ create: { width: design.master.width,
    height: design.master.height, channels: 3, background: design.colors.white } })
    .joinChannel(alpha).png().toBuffer();
await mkdir(output, { recursive: true });

function outline(font, text, size, tracking = 0) {
    const run = font.layout(text);
    const scale = size / font.unitsPerEm;
    let pen = 0, left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
    const paths = run.glyphs.map((glyph, index) => {
        if (!glyph.id) throw new Error(`Font has no glyph for ${text}`);
        const position = run.positions[index];
        const x = pen + position.xOffset;
        const y = position.yOffset;
        pen += position.xAdvance + (index < run.glyphs.length - 1 ? tracking / scale : 0);
        if (!glyph.path.commands.length) return '';
        left = Math.min(left, x + glyph.bbox.minX);
        right = Math.max(right, x + glyph.bbox.maxX);
        top = Math.max(top, y + glyph.bbox.maxY);
        bottom = Math.min(bottom, y + glyph.bbox.minY);
        return `<path transform="translate(${x} ${y})" d="${glyph.path.toSVG()}"/>`;
    }).join('');
    if (!Number.isFinite(left)) throw new Error('Lettering contains no visible glyphs.');
    return { width: Math.ceil((right - left) * scale) + 4,
        height: Math.ceil((top - bottom) * scale) + 4,
        svg: `<g transform="translate(${2 - left * scale} ${2 + top * scale}) scale(${scale} ${-scale})">${paths}</g>` };
}

const dimensions = line => ({ width: line.width, height: line.height });
const placeLine = (line, box, color) => `<g fill="${color}" transform="translate(${box.x} ${box.y})">${line.svg}</g>`;
const assets = [];
const rendered = new Map();
const variants = [];
for (const [id, definition] of Object.entries(design.variants)) {
    const brand = outline(semibold, design.name, definition.brandSize);
    const descriptor = definition.descriptorSize
        ? outline(medium, design.descriptor, definition.descriptorSize, definition.tracking) : null;
    const layout = getWordmarkV2Layout(id, { brand: dimensions(brand),
        descriptor: descriptor ? dimensions(descriptor) : null });
    variants.push({ id, ...definition, text: descriptor ? design.text : design.name, layout });
    for (const tone of ['teal', 'white']) {
        const color = design.colors[tone];
        const image = tone === 'white' ? whiteSource : source;
        const frame = layout.symbol;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-labelledby="wordmark-title"><title id="wordmark-title">${design.text}</title><desc>Approved raster symbol with outlined Pretendard lettering. ${id} layout.</desc><image x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${image.toString('base64')}"/>${placeLine(brand, layout.brand, color)}${descriptor ? placeLine(descriptor, layout.descriptor, color) : ''}</svg>`;
        const svgBytes = Buffer.from(svg);
        const svgPath = `${id}-${tone}.svg`;
        await writeFile(new URL(svgPath, output), svgBytes);
        assets.push({ path: svgPath, variant: id, tone, format: 'svg',
            width: layout.width, height: layout.height, sha256: hash(svgBytes) });
        for (const scale of [1, 2]) {
            const bytes = await sharp(svgBytes, { density: 72 * scale })
                .png({ compressionLevel: 9 }).toBuffer();
            const stats = await sharp(bytes).stats();
            if (stats.channels[3].min !== 0 || stats.channels[3].max !== 255) {
                throw new Error('Transparent logo export has an invalid alpha channel.');
            }
            const path = `${id}-${tone}${scale === 2 ? '@2x' : ''}.png`;
            await writeFile(new URL(path, output), bytes);
            assets.push({ path, variant: id, tone, format: 'png', scale,
                width: layout.width * scale, height: layout.height * scale, sha256: hash(bytes) });
            if (scale === 2) rendered.set(`${id}-${tone}`, bytes);
        }
    }
}

async function label(text, size, color, left, top) {
    const line = outline(medium, text, size);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${line.width}" height="${line.height}"><g fill="${color}">${line.svg}</g></svg>`;
    return { input: await sharp(Buffer.from(svg)).png().toBuffer(), left, top };
}

async function logo(id, tone, width, left, top) {
    return { input: await sharp(rendered.get(`${id}-${tone}`)).resize({ width }).png().toBuffer(), left, top };
}

const previews = [];
for (const dark of [false, true]) {
    const tone = dark ? 'white' : 'teal';
    const bg = dark ? design.colors.dark : design.colors.light;
    const fg = dark ? design.colors.white : design.colors.ink;
    const inverse = dark ? design.colors.light : design.colors.dark;
    const inverseTone = dark ? 'teal' : 'white';
    const panel = await sharp({ create: { width: 800, height: 360, channels: 3,
        background: inverse } }).png().toBuffer();
    const layers = [
        await label(design.text, 44, fg, 96, 64),
        await label(`WORDMARK ${design.version}`, 22, fg, 1470, 82),
        await label('기본 가로형', 28, fg, 96, 174),
        await logo('horizontal', tone, 1400, 200, 218),
        await label('세로형 · 프로필과 표지', 28, fg, 96, 846),
        await logo('stacked', tone, 560, 160, 910),
        await label('소형 · 작은 헤더와 워터마크', 28, fg, 920, 846),
        { input: panel, left: 900, top: 948 },
        await logo('compact', inverseTone, 720, 940, 987),
        await label('작게 쓸 때는 이끼를 선명하게.', 26, fg, 920, 1360),
        await label('투명 PNG · 글자 윤곽 SVG · 밝은 배경과 어두운 배경', 23, fg, 920, 1410)
    ];
    const path = dark ? 'preview-dark.png' : 'preview.png';
    const bytes = await sharp({ create: { width: 1800, height: 1600, channels: 3,
        background: bg } }).composite(layers).png({ compressionLevel: 9 }).toBuffer();
    await writeFile(new URL(path, output), bytes);
    previews.push({ path, width: 1800, height: 1600, sha256: hash(bytes) });
}

const sizeLayers = [];
for (const [left, tone, background, foreground] of [
    [0, 'teal', design.colors.light, design.colors.ink],
    [500, 'white', design.colors.dark, design.colors.white]
]) {
    sizeLayers.push({ input: await sharp({ create: { width: 500, height: 900,
        channels: 3, background } }).png().toBuffer(), left, top: 0 });
    sizeLayers.push(await label('실제 표시 크기', 28, foreground, left + 36, 32));
    for (const [id, text, width, labelTop, top] of [
        ['horizontal', '가로형 280px', 280, 112, 164],
        ['compact', '소형 104px', 104, 350, 414],
        ['stacked', '세로형 180px', 180, 556, 620]
    ]) {
        sizeLayers.push(await label(text, 24, foreground, left + 36, labelTop));
        sizeLayers.push(await logo(id, tone, width, left + 80, top));
    }
}
const sizeCheck = await sharp({ create: { width: 1000, height: 900, channels: 3,
    background: design.colors.light } }).composite(sizeLayers)
    .png({ compressionLevel: 9 }).toBuffer();
await writeFile(new URL('size-check.png', output), sizeCheck);
previews.push({ path: 'size-check.png', width: 1000, height: 900, sha256: hash(sizeCheck) });

const manifest = { version: design.version, text: design.text, runtimeReplacement: false,
    source: { path: approved.master, sha256: sourceDefinition.sha256,
        fullPaddingPreserved: true, whiteTreatment: 'original alpha silhouette' },
    fontSource: { repository: 'https://github.com/orioncactus/pretendard',
        commit: '7aeb0698819be2b4097dae8ec8fe6a795e5cf3ae' },
    fonts: fonts.map(({ font, ...definition }) => definition), colors: design.colors,
    svgFormat: 'outlined lettering with embedded original PNG symbol; not a pure vector master',
    variants, assets, previews };
const zip = new JSZip();
const date = new Date('2026-10-29T00:00:00Z');
for (const asset of [...assets, ...previews]) {
    zip.file(asset.path, await readFile(new URL(asset.path, output)), { date });
}
zip.file('manifest.json', JSON.stringify(manifest, null, 2), { date });
zip.file('guide.txt', await readFile(new URL('guide.txt', output)), { date });
zip.file('fonts/Pretendard-LICENSE.txt', await readFile(new URL(fonts[0].license, root)), { date });
for (const font of fonts) {
    zip.file(`fonts/${font.path.split('/').at(-1)}`, await readFile(new URL(font.path, root)), { date });
}
const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE',
    compressionOptions: { level: 9 } });
const archivePath = 'ikkyee-wordmark-v2.zip';
await writeFile(new URL(archivePath, output), archive);
await writeFile(new URL('manifest.json', output), JSON.stringify({ ...manifest,
    archive: { path: archivePath, bytes: archive.length, sha256: hash(archive) }
}, null, 2) + '\n');
console.log(`Exported ${assets.length} reusable wordmark assets and ${previews.length} preview sheets.`);
