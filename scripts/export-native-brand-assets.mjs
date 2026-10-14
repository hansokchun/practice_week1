import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Mechanical exports only. The approved master and existing web/Expo outputs
// are read-only; all writes are confined to the new Capacitor delivery assets.
const root = new URL('../', import.meta.url);
const require = createRequire(import.meta.url);
const master = 'brand/ikkyee-symbol-v1.png';
const background = '#F9F7F2';
const androidResources = 'app-shell/android/app/src/main/res';
const iosCatalog = 'app-shell/ios/App/App/Assets.xcassets';
const manifestPath = 'app-shell/brand-manifest.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

const outputs = [];
for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
    for (const name of ['ic_launcher', 'ic_launcher_round']) {
        outputs.push({ path: `${androidResources}/mipmap-${density}/${name}.png`,
            width: size, height: size, kind: 'icon', alpha: false });
    }
    const foregroundSize = Math.round(size * 108 / 48);
    outputs.push({ path: `${androidResources}/mipmap-${density}/ic_launcher_foreground.png`,
        width: foregroundSize, height: foregroundSize, kind: 'foreground',
        alpha: true, insetRatio: 112 / 1024 });
}
for (const [directory, width, height] of [
    ['drawable', 480, 320],
    ['drawable-land-mdpi', 480, 320], ['drawable-land-hdpi', 800, 480],
    ['drawable-land-xhdpi', 1280, 720], ['drawable-land-xxhdpi', 1600, 960],
    ['drawable-land-xxxhdpi', 1920, 1280],
    ['drawable-port-mdpi', 320, 480], ['drawable-port-hdpi', 480, 800],
    ['drawable-port-xhdpi', 720, 1280], ['drawable-port-xxhdpi', 960, 1600],
    ['drawable-port-xxxhdpi', 1280, 1920]
]) {
    outputs.push({ path: `${androidResources}/${directory}/splash.png`,
        width, height, kind: 'splash', alpha: true, symbolRatio: 0.55 });
}
outputs.push({ path: `${iosCatalog}/AppIcon.appiconset/AppIcon-512@2x.png`,
    width: 1024, height: 1024, kind: 'icon', alpha: false });
for (const [filename, size] of [
    ['splash-2732x2732-2.png', 180],
    ['splash-2732x2732-1.png', 360],
    ['splash-2732x2732.png', 540]
]) {
    // Keep the generated Xcode catalog's filenames; actual sizes correspond to
    // the launch storyboard's 180-point symbol at 1x/2x/3x, without screen crops.
    outputs.push({ path: `${iosCatalog}/Splash.imageset/${filename}`,
        width: size, height: size, kind: 'splash', alpha: true });
}

const approved = JSON.parse(await readFile(new URL('brand/manifest.json', root), 'utf8'));
const source = await readFile(new URL(master, root));
const masterRecord = approved.assets.find(asset => asset.path === master);
if (approved.master !== master || !masterRecord || hash(source) !== masterRecord.sha256) {
    throw new Error('The fixed brand master does not match its approved release.');
}

if (process.argv.includes('--check')) {
    const manifest = JSON.parse(await readFile(new URL(manifestPath, root), 'utf8'));
    if (manifest.master !== master || manifest.masterSha256 !== masterRecord.sha256
        || manifest.brandVersion !== approved.version || manifest.background !== background
        || manifest.assets.length !== outputs.length) {
        throw new Error('The native brand manifest does not match the approved release.');
    }
    for (const output of outputs) {
        const asset = manifest.assets.find(candidate => candidate.path === output.path);
        const bytes = await readFile(new URL(output.path, root));
        if (!asset || asset.sha256 !== hash(bytes)
            || bytes.readUInt32BE(16) !== output.width || bytes.readUInt32BE(20) !== output.height
            || bytes[25] !== (output.alpha ? 6 : 2)) {
            throw new Error(`Native brand delivery changed: ${output.path}`);
        }
    }
    console.log(`Verified ${outputs.length} native brand assets against the approved master.`);
} else {
    // Same Sharp export boundary as export-brand-assets.mjs. A bundled Sharp
    // installation can be selected without adding a dependency to the app.
    const sharp = require(process.env.SHARP_MODULE_PATH || 'sharp');
    const metadata = await sharp(source).metadata();
    if (!metadata.hasAlpha || metadata.width !== masterRecord.width || metadata.height !== masterRecord.height) {
        throw new Error('The approved master must retain its original transparent square canvas.');
    }
    const assets = [];
    for (const output of outputs) {
        const inset = Math.round((output.insetRatio || 0) * output.width);
        const symbolSize = output.symbolRatio
            ? Math.round(Math.min(output.width, output.height) * output.symbolRatio)
            : output.width - inset * 2;
        const remainingWidth = output.width - symbolSize;
        const remainingHeight = output.height - symbolSize;
        let pipeline = sharp(source).resize(symbolSize, symbolSize);
        if (remainingWidth || remainingHeight) {
            const left = Math.floor(remainingWidth / 2);
            const top = Math.floor(remainingHeight / 2);
            pipeline = pipeline.extend({ left, top,
                right: remainingWidth - left, bottom: remainingHeight - top,
                background: { r: 0, g: 0, b: 0, alpha: 0 } });
        }
        if (output.alpha) pipeline = pipeline.ensureAlpha();
        else pipeline = pipeline.flatten({ background }).removeAlpha();
        const target = fileURLToPath(new URL(output.path, root));
        await mkdir(dirname(target), { recursive: true });
        await pipeline.png({ compressionLevel: 9, palette: false }).toFile(target);
        const bytes = await readFile(target);
        assets.push({ ...output, sha256: hash(bytes) });
    }
    await writeFile(new URL(manifestPath, root), JSON.stringify({
        brandVersion: approved.version,
        master,
        masterSha256: masterRecord.sha256,
        background,
        generator: 'scripts/export-native-brand-assets.mjs',
        assets
    }, null, 2) + '\n');
    console.log(`Exported ${assets.length} native assets from the unchanged approved Ikkyee master.`);
}
