const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require(process.env.SHARP_MODULE_PATH || 'sharp');

async function main() {
  const [directory, output] = process.argv.slice(2);
  if (!directory || !output) throw new Error('Usage: node gif-preview.cjs <180-frame-PNG-directory> <fresh-preview.gif>');
  try { await fs.access(output); throw new Error('Output already exists; choose a fresh path'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const filenames = (await fs.readdir(directory))
    .filter(name => name.toLowerCase().endsWith('.png'))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  if (filenames.length !== 180) throw new Error(`Expected180 PNGs for a3-second60fps clip, found${filenames.length}`);
  const selected = filenames.filter((_, index) => index % 4 === 0);
  const frames = [];
  for (const name of selected) {
    const raw = await sharp(path.join(directory, name))
      .resize(360, 640, { fit: 'fill', kernel: 'lanczos3' })
      .flatten({ background: '#ffffff' })
      .removeAlpha().raw().toBuffer({ resolveWithObject: true });
    if (raw.info.channels !== 3) throw new Error('ExpectedRGB frame');
    frames.push(raw.data);
  }
  // GIF timestamps have10ms precision. Alternating70/60/70ms preserves exactly3s.
  const delays = selected.map((_, index) =>
    10 * (Math.round((index + 1) * 100 / 15) - Math.round(index * 100 / 15)));
  const data = await sharp(Buffer.concat(frames), {
    raw: { width: 360, height: 640 * frames.length, channels: 3, pageHeight: 640 }
  }).gif({
    loop: 0, delay: delays, colours: 256, effort: 7, dither: 0.6,
    interFrameMaxError: 0, interPaletteMaxError: 0
  }).toBuffer();
  await fs.writeFile(output, data, { flag: 'wx' });
  const metadata = await sharp(output, { animated: true }).metadata();
  const frameHeight = metadata.pageHeight || metadata.height;
  const durationMilliseconds = metadata.delay.reduce((total, value) => total + value, 0);
  if (metadata.width !== 360 || frameHeight !== 640 || durationMilliseconds !== 3000) {
    throw new Error(`UnexpectedGIF metadata: ${JSON.stringify(metadata)}`);
  }
  const decoded = await sharp(output, { animated: true }).raw().toBuffer({ resolveWithObject: true });
  console.log(JSON.stringify({ output, width: metadata.width, height: frameHeight,
    selectedSourceFrames: selected.length, encodedGIFFrames: metadata.pages,
    durationMilliseconds, nominalFPS: 15, loop: metadata.loop, bytes: data.length,
    decodedAllFrames: decoded.info.height === frameHeight * metadata.pages,
    delaysMilliseconds: metadata.delay
  }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
