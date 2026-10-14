import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { labelBrandDots } from './brand-motion.mjs';
import { renderBrandLettering } from './brand-lettering.mjs';
import { getShortsMotion, SHORTS_LAYOUTS } from './brand-shorts-motion.mjs';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE_PATH || 'sharp');
const JSZip = require(process.env.JSZIP_MODULE_PATH || 'jszip');
const fontkit = require(process.env.FONTKIT_MODULE_PATH || 'fontkit');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobe = process.env.FFPROBE_PATH || 'ffprobe';
const root = new URL('../', import.meta.url);
const output = new URL('public/brand/shorts/', root);
const path = name => fileURLToPath(new URL(name, output));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const kit = JSON.parse(await readFile(new URL('public/brand/manifest.json', root)));
const layouts = JSON.parse(await readFile(new URL('public/brand/korean-wordmark-layouts/manifest.json', root)));
const approved = JSON.parse(await readFile(new URL('brand/manifest.json', root)));
const sourceDefinitions = [approved.assets.find(asset => asset.path === approved.master),
    ...['close-left-teal.png', 'close-right-teal.png'].map(name => ({
        path: `public/brand/korean-wordmark-layouts/${name}`,
        sha256: layouts.assets.find(asset => asset.path === name).sha256
    })), kit.fonts.find(font => font.family === 'NanumGothic')];
const sources = [];
const buffers = [];
for (const definition of sourceDefinitions) {
    const bytes = await readFile(new URL(definition.path, root));
    if (hash(bytes) !== definition.sha256) throw new Error(`Unapproved source: ${definition.path}`);
    buffers.push(bytes);
    sources.push({ path: definition.path, sha256: definition.sha256 });
}
const font = fontkit.create(buffers[3]);
const width = 1080;
const height = 1920;
const fps = 30;
const empty = { r: 0, g: 0, b: 0, alpha: 0 };
const canvas = (w = width, h = height) => sharp({ create: { width: w, height: h, channels: 4, background: empty } });
const workspace = await mkdtemp(join(tmpdir(), 'ikkyee-shorts-'));
const assets = [];
await mkdir(output, { recursive: true });

const toWhite = async input => {
    const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) data[i] = data[i + 1] = data[i + 2] = 255;
    return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
};
const background = (input, tone) => sharp(input).flatten({
    background: tone === 'light' ? kit.colors.light : kit.colors.dark
}).removeAlpha().png({ compressionLevel: 9 }).toBuffer();
const faded = (pixels, opacity, w, h) => {
    const data = Buffer.from(pixels);
    for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * opacity);
    return { input: data, raw: { width: w, height: h, channels: 4 } };
};
function alphaOrigin(pixels, w, h) {
    let left = w;
    let top = h;
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
        if (!pixels[(y * w + x) * 4 + 3]) continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
    }
    return { left, top };
}
async function lettering(text, size, top) {
    const rendered = await renderBrandLettering(font, text, size, kit.colors.teal, sharp);
    if (rendered.width > 900) throw new Error(`Lettering exceeds portrait margins: ${text}`);
    return { input: rendered.bytes, left: Math.round((width - rendered.width) / 2), top,
        pixels: await sharp(rendered.bytes).raw().toBuffer(), width: rendered.width, height: rendered.height };
}
async function imageAsset(name, bytes, alpha, usage) {
    await writeFile(new URL(name, output), bytes);
    const metadata = await sharp(bytes).metadata();
    assets.push({ path: name, type: 'image', alpha, usage, width: metadata.width, height: metadata.height,
        bytes: bytes.length, sha256: hash(bytes) });
}
const encode = args => execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args],
    { stdio: 'inherit' });
async function alphaCoverage(name, seconds) {
    const png = execFileSync(ffmpeg, ['-v', 'error', '-ss', String(seconds), '-i', path(name),
        '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-pix_fmt', 'rgba', 'pipe:1'],
    { maxBuffer: 32 * 1024 * 1024 });
    const pixels = await sharp(png).ensureAlpha().raw().toBuffer();
    let visiblePixels = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) visiblePixels += 1;
    return { visiblePixels, transparentPixels: width * height - visiblePixels };
}
async function videoAsset(name, duration, alpha, usage) {
    const probe = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-count_frames', '-show_streams',
        '-show_format', '-of', 'json', path(name)], { encoding: 'utf8' }));
    const video = probe.streams.find(stream => stream.codec_type === 'video');
    const frames = Number(video.nb_read_frames);
    if (video.width !== width || video.height !== height || video.r_frame_rate !== '30/1'
        || frames !== duration * fps || probe.streams.some(stream => stream.codec_type === 'audio')
        || Math.abs(Number(probe.format.duration) - duration) > 0.01
        || video.codec_name !== (alpha ? 'prores' : 'h264')) throw new Error(`Encoded stream failed QA: ${name}`);
    const verification = { frames, pixelFormat: video.pix_fmt };
    if (alpha) {
        if (!video.pix_fmt.startsWith('yuva')) throw new Error(`Overlay has no alpha stream: ${name}`);
        verification.alphaAtStart = await alphaCoverage(name, 0);
        verification.alphaAtHold = await alphaCoverage(name, 1.5);
        verification.alphaAtEnd = await alphaCoverage(name, duration - 1 / fps);
        if (verification.alphaAtStart.visiblePixels || verification.alphaAtEnd.visiblePixels
            || verification.alphaAtHold.visiblePixels < 1000) throw new Error(`Overlay alpha failed QA: ${name}`);
    }
    const bytes = await readFile(new URL(name, output));
    assets.push({ path: name, type: 'video', width, height, fps, duration, alpha, audio: false, usage,
        codec: alpha ? 'ProRes 4444' : 'H.264', bytes: bytes.length, sha256: hash(bytes), verification });
}

try {
    const logo = await sharp(buffers[1]).resize(840, 205).png().toBuffer();
    const logoPixels = await sharp(logo).raw().toBuffer();
    const sourcePixels = await sharp(buffers[1]).raw().toBuffer();
    const masterPixels = await sharp(buffers[0]).ensureAlpha().raw().toBuffer();
    const masterAlpha = Uint8Array.from({ length: 1254 * 1254 }, (_, index) => masterPixels[index * 4 + 3]);
    const { labels } = labelBrandDots(masterAlpha, 1254, 1254);
    // Classify dots before downscaling: antialiasing can connect the final dot to the pin.
    const rolePixels = await sharp(Buffer.from(labels), { raw: { width: 1254, height: 1254, channels: 1 } })
        .resize(400, 400, { kernel: 'nearest' }).greyscale().raw().toBuffer();
    if (rolePixels.length !== 400 * 400) throw new Error('Unexpected symbol label format.');
    const masterSmall = await sharp(buffers[0]).resize(400, 400).ensureAlpha().raw().toBuffer();
    const prefix = await sharp(buffers[1]).extract({ left: 0, top: 0, width: 420, height: 440 }).raw().toBuffer();
    const masterOrigin = alphaOrigin(masterSmall, 400, 400);
    const origin = alphaOrigin(prefix, 420, 440);
    const shiftX = origin.left - masterOrigin.left;
    const shiftY = origin.top - masterOrigin.top;
    const revealLayers = [];
    for (let role = 0; role <= 7; role += 1) {
        const pixels = Buffer.from(sourcePixels);
        for (let y = 0; y < 440; y += 1) for (let x = 0; x < 1800; x += 1) {
            const sx = x - shiftX;
            const sy = y - shiftY;
            const actualRole = x >= 420 ? 7 : sx >= 0 && sx < 400 && sy >= 0 && sy < 400
                ? rolePixels[sy * 400 + sx] : 0;
            if (actualRole !== role) pixels[(y * 1800 + x) * 4 + 3] = 0;
        }
        revealLayers.push(await sharp(pixels, { raw: { width: 1800, height: 440, channels: 4 } })
            .resize(840, 205).raw().toBuffer());
    }
    const ctaLayers = [await lettering('당신만의 장소를', 44, 990),
        await lettering('찾아보거나 공유하세요', 44, 1060), await lettering('ikkyee.com', 38, 1190)];
    for (const [kind, duration] of [['intro', 3], ['outro', 4], ['overlay', 3]]) {
        const dir = join(workspace, kind);
        await mkdir(dir);
        const layout = SHORTS_LAYOUTS[kind];
        const finalLayers = [{ input: logo, left: layout.left, top: layout.top }];
        if (kind === 'outro') finalLayers.push(...ctaLayers.map(({ input, left, top }) => ({ input, left, top })));
        const endFrame = await canvas().composite(finalLayers).png().toBuffer();
        for (let index = 0; index < duration * fps; index += 1) {
            const seconds = index / fps;
            const motion = getShortsMotion(seconds, kind);
            let bytes = endFrame;
            if (kind === 'overlay') {
                bytes = await canvas().composite([{ ...faded(logoPixels, motion.opacity, 840, 205),
                    left: layout.left, top: layout.top + Math.round(motion.offset) }]).png().toBuffer();
            } else if (seconds < 1.8) {
                const items = motion.dots.map((opacity, dot) => ({
                    ...faded(revealLayers[dot + 1], opacity, 840, 205), left: layout.left, top: layout.top
                }));
                items.push({ ...faded(revealLayers[0], motion.symbol, 840, 205),
                    left: layout.left, top: layout.top + Math.round(motion.symbolOffset) });
                items.push({ ...faded(revealLayers[7], motion.wordmark, 840, 205),
                    left: layout.left, top: layout.top + Math.round(motion.wordmarkOffset) });
                if (kind === 'outro') for (const [n, layer] of ctaLayers.entries()) {
                    items.push({ ...faded(layer.pixels, n === 2 ? motion.website : motion.cta,
                        layer.width, layer.height), left: layer.left, top: layer.top });
                }
                bytes = await canvas().composite(items).png().toBuffer();
            }
            await writeFile(join(dir, `frame-${String(index).padStart(3, '0')}.png`), bytes);
        }
        const input = ['-framerate', String(fps), '-i', join(dir, 'frame-%03d.png')];
        const common = ['-an', '-t', String(duration), '-threads', '2'];
        if (kind === 'overlay') {
            for (const tone of ['teal', 'white']) {
                const name = `overlay-${tone}.mov`;
                const filter = tone === 'white' ? 'format=rgba,lutrgb=r=255:g=255:b=255,format=yuva444p10le'
                    : 'format=yuva444p10le';
                encode([...input, '-vf', filter, '-c:v', 'prores_ks', '-profile:v', '4', '-alpha_bits', '16',
                    '-qscale:v', '9', '-vendor', 'apl0', ...common, path(name)]);
                await videoAsset(name, duration, true, '영상 위에 겹치는 하단 로고');
            }
            encode([...input, '-f', 'lavfi', '-i', `color=c=0xF9F7F2:s=1080x1920:r=30:d=${duration}`,
                '-filter_complex', '[1:v][0:v]overlay=0:0:format=auto,format=yuv420p', '-c:v', 'libx264',
                '-crf', '20', ...common, join(dir, 'preview.mp4')]);
        } else for (const [tone, color] of [['light', '0xF9F7F2'], ['dark', '0x1A4D4E']]) {
            const name = `${kind}-${tone}.mp4`;
            const filter = tone === 'dark'
                ? '[0:v]format=rgba,lutrgb=r=255:g=255:b=255[logo];[1:v][logo]overlay=0:0:format=auto,format=yuv420p'
                : '[1:v][0:v]overlay=0:0:format=auto,format=yuv420p';
            encode([...input, '-f', 'lavfi', '-i', `color=c=${color}:s=1080x1920:r=30:d=${duration}`,
                '-filter_complex', filter, '-c:v', 'libx264', '-crf', '18', '-preset', 'medium',
                '-movflags', '+faststart', ...common, path(name)]);
            await videoAsset(name, duration, false, kind === 'intro' ? '쇼츠 시작 화면' : '쇼츠 마무리 화면');
            const frame = tone === 'light' ? endFrame : await toWhite(endFrame);
            await imageAsset(`${kind}-${tone}.png`, await background(frame, tone), false,
                kind === 'intro' ? '정지 시작 화면' : '정지 마무리 화면');
        }
        const gif = `${kind}-preview.gif`;
        const gifSource = kind === 'overlay' ? join(dir, 'preview.mp4') : path(`${kind}-light.mp4`);
        encode(['-i', gifSource, '-filter_complex',
            'fps=12,scale=270:480:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=sierra2_4a',
            '-loop', '0', path(gif)]);
        const bytes = await readFile(new URL(gif, output));
        assets.push({ path: gif, type: 'preview', width: 270, height: 480, bytes: bytes.length, sha256: hash(bytes) });
        console.log(`Rendered and verified ${kind}: ${duration}s, 1080x1920, 30fps.`);
    }

    for (const [side, originalLogo] of [['left', buffers[1]], ['right', buffers[2]]]) {
        for (const tone of ['teal', 'white']) {
            const source = tone === 'teal' ? originalLogo : await toWhite(originalLogo);
            const resized = await sharp(source).resize(840, 205).png().toBuffer();
            const positioned = await canvas().composite([{ input: resized, left: 120, top: 1280 }]).png().toBuffer();
            await imageAsset(`overlay-${side}-${tone}.png`, positioned, true, '전체화면 투명 하단 로고');
            await imageAsset(`watermark-${side}-${tone}.png`, await sharp(source).resize(720, 176).png().toBuffer(),
                true, '위치와 크기를 자유롭게 조절하는 워터마크');
        }
    }
    const descriptor = await lettering('장소아카이브', 76, 930);
    const name = await lettering('이끼', 132, 1040);
    const stacked = await canvas().composite([
        { input: await sharp(buffers[0]).resize(400, 400).png().toBuffer(), left: 340, top: 500 },
        ...[descriptor, name].map(({ input, left, top }) => ({ input, left, top }))
    ]).png().toBuffer();
    for (const tone of ['teal', 'white']) {
        const frame = tone === 'teal' ? stacked : await toWhite(stacked);
        await imageAsset(`stacked-${tone}.png`, frame, true, '세로 조합 로고');
        const backing = tone === 'teal' ? 'light' : 'dark';
        await imageAsset(`stacked-${backing}.png`, await background(frame, backing), false, '세로 조합 표지');
    }

    const previewLabels = ['시작 · 밝은 배경', '시작 · 어두운 배경', '마무리 화면', '하단 로고', '오른쪽 심볼', '세로 조합'];
    const previewNames = ['intro-light.png', 'intro-dark.png', 'outro-dark.png',
        'overlay-left-white.png', 'overlay-right-white.png', 'stacked-light.png'];
    const layers = [];
    for (let index = 0; index < previewNames.length; index += 1) {
        const input = await sharp(await readFile(new URL(previewNames[index], output))).resize(270, 480)
            .flatten({ background: '#516C69' }).png().toBuffer();
        const left = 40 + (index % 3) * 310;
        const top = 30 + Math.floor(index / 3) * 540;
        layers.push({ input, left, top });
        const caption = await renderBrandLettering(font, previewLabels[index], 22, kit.colors.teal, sharp);
        layers.push({ input: caption.bytes, left: left + Math.round((270 - caption.width) / 2), top: top + 494 });
    }
    const preview = await canvas(970, 1110).composite(layers).flatten({ background: '#FFFFFF' }).png().toBuffer();
    await writeFile(new URL('preview.png', output), preview);
    for (const asset of assets) if (asset.bytes >= 25 * 1024 * 1024) throw new Error(`Hosting file budget exceeded: ${asset.path}`);
    const manifest = { version: '1.0', text: '장소아카이브 이끼', width, height, fps, runtimeReplacement: false,
        sources, layouts: SHORTS_LAYOUTS, assets, preview: { path: 'preview.png', sha256: hash(preview) } };
    const archives = [];
    for (const [archiveName, files] of [
        ['ikkyee-shorts-kit.zip', assets.filter(asset => !asset.path.endsWith('.mov')).map(asset => asset.path)],
        ['ikkyee-shorts-alpha-teal.zip', ['overlay-teal.mov']],
        ['ikkyee-shorts-alpha-white.zip', ['overlay-white.mov']]
    ]) {
        const zip = new JSZip();
        const date = new Date('2026-10-15T00:00:00Z');
        for (const file of [...files, 'preview.png', 'guide.txt']) zip.file(file, await readFile(new URL(file, output)), { date });
        zip.file('manifest.json', JSON.stringify(manifest, null, 2), { date });
        zip.file('NanumGothic-OFL.txt', await readFile(new URL('brand/fonts/NanumGothic-OFL.txt', root)), { date });
        const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
        if (bytes.length >= 25 * 1024 * 1024) throw new Error(`Archive budget exceeded: ${archiveName}`);
        await writeFile(new URL(archiveName, output), bytes);
        archives.push({ path: archiveName, bytes: bytes.length, sha256: hash(bytes) });
    }
    await writeFile(new URL('manifest.json', output), JSON.stringify({ ...manifest, archives }, null, 2) + '\n');
    console.log(`Finished ${assets.length} assets, three ZIPs and decoded-stream/alpha verification.`);
} finally {
    await rm(workspace, { recursive: true, force: true });
}
