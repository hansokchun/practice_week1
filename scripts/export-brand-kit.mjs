import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Legacy full-kit exporter kept for reproducible historical downloads.
// Current marketing uses public/brand/wordmark-v2 (이끼 · 장소 저장소).

const root = new URL('../', import.meta.url);
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE_PATH || 'sharp');
const JSZip = require(process.env.JSZIP_MODULE_PATH || 'jszip');
const fontkit = require(process.env.FONTKIT_MODULE_PATH || 'fontkit');
const output = new URL('public/brand/', root);
const approved = JSON.parse(await readFile(new URL('brand/manifest.json', root)));
const source = await readFile(new URL(approved.master, root));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
if (hash(source) !== approved.assets.find(asset => asset.path === approved.master).sha256) {
    throw new Error('The approved brand master has changed.');
}

const colors = { teal: '#245457', dark: '#1A4D4E', light: '#F9F7F2', white: '#FFFFFF' };
const fontDefinitions = [
    { family: 'Cormorant Garamond', path: 'brand/fonts/CormorantGaramond-Variable.ttf',
        license: 'brand/fonts/CormorantGaramond-OFL.txt' },
    { family: 'NanumGothic', path: 'brand/fonts/NanumGothic-Bold.ttf',
        license: 'brand/fonts/NanumGothic-OFL.txt' }
];
const fonts = [];
const renderFonts = [];
for (const font of fontDefinitions) {
    const bytes = await readFile(new URL(font.path, root));
    const parsed = fontkit.create(bytes);
    renderFonts.push(parsed.variationAxes.wght ? parsed.getVariation({ wght: 700 }) : parsed);
    fonts.push({ ...font, sha256: hash(bytes) });
}
const alpha = await sharp(source).extractChannel('alpha').png().toBuffer();
const white = await sharp({ create: { width: 1254, height: 1254, channels: 3,
    background: colors.white } }).joinChannel(alpha).png().toBuffer();
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const canvas = (width, height, background = transparent) => sharp({
    create: { width, height, channels: 4, background }
});
const fit = (input, width, height = width) => sharp(input).resize(width, height).png().toBuffer();

async function lettering(text, size, color, latin = false) {
    const font = renderFonts[latin ? 0 : 1];
    const run = font.layout(text);
    const scale = size / font.unitsPerEm;
    const bounds = { left: Infinity, top: -Infinity, right: -Infinity, bottom: Infinity };
    let pen = 0;
    const paths = run.glyphs.map((glyph, index) => {
        if (!glyph.id) throw new Error(`Missing glyph in ${fonts[latin ? 0 : 1].family}: ${text}`);
        const position = run.positions[index];
        const x = pen + position.xOffset;
        const y = position.yOffset;
        pen += position.xAdvance;
        if (glyph.path.commands.length) {
            bounds.left = Math.min(bounds.left, x + glyph.bbox.minX);
            bounds.right = Math.max(bounds.right, x + glyph.bbox.maxX);
            bounds.top = Math.max(bounds.top, y + glyph.bbox.maxY);
            bounds.bottom = Math.min(bounds.bottom, y + glyph.bbox.minY);
        }
        return `<path transform="translate(${x} ${y})" d="${glyph.path.toSVG()}"/>`;
    }).join('');
    const width = Math.ceil((bounds.right - bounds.left) * scale) + 4;
    const height = Math.ceil((bounds.top - bounds.bottom) * scale) + 4;
    // Render font outlines directly; host font fallback cannot change the wordmark.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><g fill="${color}" transform="translate(${2 - bounds.left * scale} ${2 + bounds.top * scale}) scale(${scale} ${-scale})">${paths}</g></svg>`;
    return { data: await sharp(Buffer.from(svg)).png().toBuffer(), width, height };
}

async function wordmark(color) {
    const latin = await lettering('Ikkyee', 260, color, true);
    const korean = await lettering('이끼', 100, color);
    const width = latin.width + 100 + korean.width;
    if (width > 1400 || Math.max(latin.height, korean.height) > 360) {
        throw new Error('Brand lettering exceeds its fixed canvas.');
    }
    const start = Math.round((1400 - width) / 2);
    const divider = await canvas(2, 110, color).png().toBuffer();
    return canvas(1400, 360).composite([
        { input: latin.data, left: start, top: Math.round((360 - latin.height) / 2) },
        { input: divider, left: start + latin.width + 48, top: 125 },
        { input: korean.data, left: start + latin.width + 100,
            top: Math.round((360 - korean.height) / 2) }
    ]).png().toBuffer();
}

const wordmarks = { teal: await wordmark(colors.teal), white: await wordmark(colors.white) };
const horizontal = {};
for (const tone of ['teal', 'white']) {
    horizontal[tone] = await canvas(1800, 600).composite([
        { input: await fit(tone === 'white' ? white : source, 540), left: 0, top: 30 },
        { input: await fit(wordmarks[tone], 1220, 314), left: 540, top: 143 }
    ]).png().toBuffer();
}

const assets = [];
async function deliver(path, bytes, category, usage, isTransparent = false) {
    await mkdir(new URL(`assets/${category}/`, output), { recursive: true });
    const relative = `assets/${category}/${path}.png`;
    await writeFile(new URL(relative, output), bytes);
    const info = await sharp(bytes).metadata();
    assets.push({ path: relative, category, usage, width: info.width, height: info.height,
        alpha: info.hasAlpha, transparent: isTransparent, sha256: hash(bytes) });
}
async function opaque(input, background = colors.light, keepAlpha = false) {
    let pipeline = sharp(input).flatten({ background });
    pipeline = keepAlpha ? pipeline.ensureAlpha() : pipeline.removeAlpha();
    return pipeline.png({ compressionLevel: 9 }).toBuffer();
}
async function centeredText(text, size, color, width, top) {
    const rendered = await lettering(text, size, color);
    if (rendered.width > width - 96) throw new Error(`Text exceeds canvas: ${text}`);
    return { input: rendered.data, left: Math.round((width - rendered.width) / 2), top };
}

await deliver('symbol-teal-1254', source, 'logos', '기본 심볼 · 밝은 배경', true);
await deliver('symbol-white-1254', white, 'logos', '흰색 심볼 · 사진 및 어두운 배경', true);
for (const tone of ['teal', 'white']) {
    await deliver(`lockup-horizontal-${tone}`, horizontal[tone], 'logos', '가로형 로고 · 웹 헤더·제휴·영상', true);
    await deliver(`wordmark-${tone}`, wordmarks[tone], 'logos', '글자형 로고 · 좁은 가로 공간', true);
}
for (const tone of ['light', 'dark']) {
    const isDark = tone === 'dark';
    const bytes = await canvas(1080, 1080, colors[tone]).composite([
        { input: await fit(isDark ? white : source, 540), left: 270, top: 100 },
        { input: await fit(wordmarks[isDark ? 'white' : 'teal'], 820, 211), left: 130, top: 650 }
    ]).png().toBuffer();
    await deliver(`lockup-stacked-${tone}`, await opaque(bytes), 'logos', '세로형 로고 · 표지·소개 화면');
}

const appIcon = await readFile(new URL('mobile/assets/app-icon.png', root));
const foreground = await readFile(new URL('mobile/assets/app-icon-foreground.png', root));
await deliver('app-store-1024', appIcon, 'app', 'App Store · 1024px 불투명 아이콘');
await deliver('google-play-512', await opaque(await fit(appIcon, 512), colors.light, true),
    'app', 'Google Play · 512px 전체 불투명 32-bit PNG');
await deliver('android-adaptive-foreground-1024', foreground, 'app', 'Android 적응형 아이콘 전경 · 배경은 별도', true);
const mono = await canvas(1024, 1024).composite([
    { input: await fit(white, 800), left: 112, top: 112 }
]).png().toBuffer();
await deliver('android-monochrome-1024', mono, 'app', 'Android 테마 아이콘 · 알파 마스크', true);
for (const size of [32, 48, 96]) {
    await deliver(`favicon-${size}`, await fit(source, size), 'web', '브라우저 탭·작은 웹 아이콘', true);
}
await deliver('apple-touch-180', await opaque(await fit(appIcon, 180)), 'web', '웹사이트 홈 화면 바로가기');
for (const tone of ['light', 'dark']) {
    await deliver(`profile-${tone}-1080`, await opaque(await fit(tone === 'dark' ? white : source, 1080),
        colors[tone]), 'social', 'SNS·카카오 채널 프로필 · 원형 크롭 여백 유지');
}

for (const tone of ['light', 'dark']) {
    const color = tone === 'dark' ? colors.white : colors.teal;
    const logo = tone === 'dark' ? horizontal.white : horizontal.teal;
    const link = await canvas(1200, 630, colors[tone]).composite([
        { input: await fit(logo, 1040, 347), left: 80, top: 90 },
        await centeredText('장소 저장소', 32, color, 1200, 435),
        await centeredText('ikkyee.com', 26, color, 1200, 548)
    ]).png().toBuffer();
    await deliver(`link-preview-${tone}`, await opaque(link), 'marketing', '기본 소개·링크 썸네일 · 1200×630');
    const feed = await canvas(1080, 1080, colors[tone]).composite([
        { input: await fit(tone === 'dark' ? white : source, 500), left: 290, top: 120 },
        { input: await fit(wordmarks[tone === 'dark' ? 'white' : 'teal'], 820, 211), left: 130, top: 625 },
        await centeredText('장소 저장소', 32, color, 1080, 866),
        await centeredText('ikkyee.com', 24, color, 1080, 984)
    ]).png().toBuffer();
    await deliver(`feed-${tone}`, await opaque(feed), 'marketing', 'SNS 정사각 게시물 · 1080×1080');
}
const story = await canvas(1080, 1920, colors.dark).composite([
    await centeredText('사진 · 장소 · 위치', 32, colors.white, 1080, 230),
    { input: await fit(white, 700), left: 190, top: 390 },
    { input: await fit(wordmarks.white, 900, 231), left: 90, top: 1100 },
    await centeredText('장소 저장소', 40, colors.white, 1080, 1400),
    await centeredText('ikkyee.com', 28, colors.white, 1080, 1660)
]).png().toBuffer();
await deliver('story-dark', await opaque(story), 'marketing', 'SNS 스토리·영상 끝 화면 · 1080×1920');
const feature = await canvas(1024, 500, colors.light).composite([
    { input: await fit(horizontal.teal, 880, 293), left: 72, top: 50 },
    await centeredText('장소 저장소', 28, colors.teal, 1024, 358),
    await centeredText('ikkyee.com', 22, colors.teal, 1024, 443)
]).png().toBuffer();
await deliver('google-play-feature', await opaque(feature), 'marketing', 'Google Play 피처 그래픽 · 1024×500');

const previewItems = [
    ['logos/lockup-horizontal-teal', '가로형 로고', colors.light],
    ['logos/lockup-horizontal-white', '어두운 배경용', colors.dark],
    ['logos/wordmark-teal', '글자형 로고', colors.light],
    ['app/app-store-1024', '앱 아이콘', colors.white],
    ['social/profile-dark-1080', 'SNS 프로필', colors.white],
    ['logos/lockup-stacked-light', '세로형 로고', colors.white],
    ['marketing/link-preview-light', '공유·소개 이미지', colors.white],
    ['marketing/feed-dark', 'SNS 게시물', colors.white],
    ['marketing/story-dark', '스토리·영상', colors.white]
];
const layers = [await centeredText('이끼 브랜드 파일', 34, colors.teal, 1200, 40)];
for (const [index, [path, label, background]] of previewItems.entries()) {
    const left = 36 + (index % 3) * 388;
    const top = 120 + Math.floor(index / 3) * 348;
    const image = await sharp(await readFile(new URL(`assets/${path}.png`, output)))
        .resize(348, 268, { fit: 'contain', background }).flatten({ background }).png().toBuffer();
    layers.push({ input: image, left, top });
    const caption = await lettering(label, 20, colors.teal);
    layers.push({ input: caption.data, left: left + Math.round((348 - caption.width) / 2), top: top + 292 });
}
const preview = await canvas(1200, 1180, '#F0F2F1').composite(layers).removeAlpha().png().toBuffer();
await writeFile(new URL('preview.png', output), preview);

const zip = new JSZip();
const zipDate = new Date('2026-10-14T00:00:00Z');
for (const asset of assets) zip.file(asset.path, await readFile(new URL(asset.path, output)), { date: zipDate });
zip.file('사용안내.txt', await readFile(new URL('사용안내.txt', output)), { date: zipDate });
zip.file('preview.png', preview, { date: zipDate });
for (const font of fonts) {
    for (const path of [font.path, font.license]) {
        zip.file(path.replace('brand/', ''), await readFile(new URL(path, root)), { date: zipDate });
    }
}
const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE',
    compressionOptions: { level: 9 } });
await writeFile(new URL('ikkyee-brand-kit-v1.zip', output), archive);
await writeFile(new URL('manifest.json', output), JSON.stringify({
    brandVersion: approved.version, kitVersion: '1.0', master: approved.master,
    masterSha256: hash(source), colors, fonts, assets,
    preview: { path: 'preview.png', sha256: hash(preview) },
    archive: { path: 'ikkyee-brand-kit-v1.zip', bytes: archive.length, sha256: hash(archive) }
}, null, 2) + '\n');
console.log(`Exported ${assets.length} brand assets; archive ${(archive.length / 1024 / 1024).toFixed(2)} MiB.`);
