import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBrandMotionProgress, labelBrandDots } from './brand-motion.mjs';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE_PATH || 'sharp');
const JSZip = require(process.env.JSZIP_MODULE_PATH || 'jszip');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const root = new URL('../', import.meta.url);
const out = new URL('public/brand/animation/', root);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const approved = JSON.parse(await readFile(new URL('brand/manifest.json', root)));
const kit = JSON.parse(await readFile(new URL('public/brand/manifest.json', root)));
const sources = [approved.assets.find(asset => asset.path === approved.master)];
for (const name of ['logos/wordmark-teal', 'logos/lockup-horizontal-teal']) {
    const asset = kit.assets.find(item => item.path === `assets/${name}.png`);
    sources.push({ path: `public/brand/${asset.path}`, sha256: asset.sha256 });
}
const buffers = [];
for (const source of sources) {
    const bytes = await readFile(new URL(source.path, root));
    if (hash(bytes) !== source.sha256) throw new Error(`Unapproved source: ${source.path}`);
    buffers.push(bytes);
}
const workspace = await mkdtemp(join(tmpdir(), 'ikkyee-animation-'));
await mkdir(out, { recursive: true });
const rawOptions = { width: 540, height: 540, channels: 4 };
const sourceRaw = await sharp(buffers[0]).ensureAlpha().raw().toBuffer();
const alpha = Uint8Array.from({ length: 1254 * 1254 }, (_, index) => sourceRaw[index * 4 + 3]);
const { labels, dots } = labelBrandDots(alpha, 1254, 1254);
console.log(`Revealing the approved ${dots.length}-dot trail without redrawing artwork.`);
const layers = [];
for (let role = 0; role <= 6; role += 1) {
    const pixels = Buffer.from(sourceRaw);
    for (let index = 0; index < labels.length; index += 1) {
        if (labels[index] !== role) pixels[index * 4 + 3] = 0;
    }
    layers.push(await sharp(pixels, { raw: { width: 1254, height: 1254, channels: 4 } })
        .resize(540, 540).raw().toBuffer());
}
const wordmark = await sharp(buffers[1]).resize(1220, 314).ensureAlpha().raw().toBuffer();
const empty = { r: 0, g: 0, b: 0, alpha: 0 };
const canvas = (width, height) => sharp({ create: { width, height, channels: 4, background: empty } });
const faded = (pixels, opacity, raw) => {
    const data = Buffer.from(pixels);
    if (opacity < 1) for (let index = 3; index < data.length; index += 4) data[index] = Math.round(data[index] * opacity);
    return { input: data, raw };
};
const finalLogo = await sharp(buffers[2]).resize(1440, 480).png().toBuffer();
const fullFrame = input => canvas(1920, 1080).composite([{ input, left: 240, top: 300 }]).png().toBuffer();
const endFrame = await fullFrame(finalLogo);
const frames = [];
try {
    for (let index = 0; index < 90; index += 1) {
        const seconds = index / 30;
        let bytes = endFrame;
        if (seconds < 1.8) {
            const motion = getBrandMotionProgress(seconds);
            const items = motion.dots.map((opacity, dot) => ({
                ...faded(layers[dot + 1], opacity, rawOptions), left: 0, top: 30
            }));
            items.push({ ...faded(layers[0], motion.symbol, rawOptions), left: 0,
                top: Math.round(30 + motion.symbolOffset) });
            items.push({ ...faded(wordmark, motion.wordmark, { width: 1220, height: 314, channels: 4 }),
                left: 540, top: Math.round(143 + motion.wordmarkOffset) });
            const scene = await canvas(1800, 600).composite(items).png().toBuffer();
            bytes = await fullFrame(await sharp(scene).resize(1440, 480).png().toBuffer());
        }
        const path = join(workspace, `frame-${String(index).padStart(3, '0')}.png`);
        await writeFile(path, bytes);
        if ([3, 12, 24, 36, 48, 75].includes(index)) {
            const image = await sharp(bytes).resize(640, 360).flatten({ background: '#F9F7F2' }).png().toBuffer();
            frames.push(image);
        }
    }
    const pattern = join(workspace, 'frame-%03d.png');
    const command = args => execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args],
        { stdio: 'inherit' });
    const input = ['-framerate', '30', '-i', pattern];
    const target = path => fileURLToPath(new URL(path, out));
    const videoOptions = ['-an', '-t', '3', '-threads', '2'];
    command([...input, '-f', 'lavfi', '-i', 'color=c=0xF9F7F2:s=1920x1080:r=30:d=3',
        '-filter_complex', '[1:v][0:v]overlay=0:0:format=auto,format=yuv420p',
        '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart',
        ...videoOptions, target('ikkyee-logo-light.mp4')]);
    command([...input, '-f', 'lavfi', '-i', 'color=c=0x1A4D4E:s=1920x1080:r=30:d=3',
        '-filter_complex', '[0:v]format=rgba,lutrgb=r=255:g=255:b=255[logo];[1:v][logo]overlay=0:0:format=auto,format=yuv420p',
        '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart',
        ...videoOptions, target('ikkyee-logo-dark.mp4')]);
    for (const tone of ['teal', 'white']) {
        const filter = tone === 'white' ? 'format=rgba,lutrgb=r=255:g=255:b=255,format=yuva444p10le'
            : 'format=yuva444p10le';
        command([...input, '-vf', filter, '-c:v', 'prores_ks', '-profile:v', '4', '-alpha_bits', '16',
            '-qscale:v', '9', '-vendor', 'apl0', ...videoOptions, target(`ikkyee-logo-transparent-${tone}.mov`)]);
    }
    command(['-i', target('ikkyee-logo-light.mp4'), '-filter_complex',
        'fps=15,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=sierra2_4a',
        '-loop', '0', target('preview.gif')]);
    const poster = await sharp(endFrame).flatten({ background: '#F9F7F2' }).png().toBuffer();
    await writeFile(new URL('poster-light.png', out), poster);
    const endRaw = await sharp(endFrame).ensureAlpha().raw().toBuffer();
    for (let index = 0; index < endRaw.length; index += 4) endRaw[index] = endRaw[index + 1] = endRaw[index + 2] = 255;
    const darkPoster = await sharp(endRaw, { raw: { width: 1920, height: 1080, channels: 4 } })
        .flatten({ background: '#1A4D4E' }).png().toBuffer();
    await writeFile(new URL('poster-dark.png', out), darkPoster);
    await writeFile(new URL('frames.png', out), await canvas(1280, 1080).composite(frames.map((input, index) => ({
        input, left: (index % 2) * 640, top: Math.floor(index / 2) * 360
    }))).removeAlpha().png().toBuffer());
    const assets = [];
    for (const [path, codec, hasAlpha] of [
        ['ikkyee-logo-light.mp4', 'H.264', false], ['ikkyee-logo-dark.mp4', 'H.264', false],
        ['ikkyee-logo-transparent-teal.mov', 'ProRes 4444', true],
        ['ikkyee-logo-transparent-white.mov', 'ProRes 4444', true], ['preview.gif', 'GIF', false]
    ]) {
        const bytes = await readFile(new URL(path, out));
        if (bytes.length > 25 * 1024 * 1024) throw new Error(`Export exceeds hosting budget: ${path}`);
        assets.push({ path, codec, alpha: hasAlpha, bytes: bytes.length, sha256: hash(bytes) });
    }
    const manifest = { brandVersion: approved.version, width: 1920, height: 1080, fps: 30,
        duration: 3, frames: 90, audio: false, sources, assets };
    const zip = new JSZip();
    const date = new Date('2026-10-15T00:00:00Z');
    for (const path of [...assets.map(asset => asset.path), 'poster-light.png', 'poster-dark.png', 'frames.png', '사용안내.txt']) {
        zip.file(path, await readFile(new URL(path, out)), { date });
    }
    zip.file('manifest.json', JSON.stringify(manifest, null, 2), { date });
    const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
    await writeFile(new URL('ikkyee-logo-animation.zip', out), archive);
    await writeFile(new URL('manifest.json', out), JSON.stringify({ ...manifest,
        archive: { path: 'ikkyee-logo-animation.zip', bytes: archive.length, sha256: hash(archive) }
    }, null, 2) + '\n');
    console.log(assets.map(asset => `${asset.path}: ${(asset.bytes / 1024 / 1024).toFixed(2)} MiB`).join('\n'));
    console.log('Finished the approved-logo animation without regenerating the symbol.');
} finally {
    await rm(workspace, { recursive: true, force: true });
}
