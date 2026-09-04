import { brotliCompressSync } from 'node:zlib';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const budgets = {
    javascriptBrotliKb: 70,
    cssBrotliKb: 30,
    totalImageKb: 2200,
    largestImageKb: 450
};

const assetsDirectory = fileURLToPath(new URL('../dist/assets/', import.meta.url));
const imageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);
const files = readdirSync(assetsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => ({
        name: entry.name,
        extension: extname(entry.name).toLowerCase(),
        contents: readFileSync(join(assetsDirectory, entry.name))
    }));

const sum = (values) => values.reduce((total, value) => total + value, 0);
const toKb = (bytes) => Number((bytes / 1024).toFixed(2));
const brotliSize = (extension) => sum(
    files
        .filter((file) => file.extension === extension)
        .map((file) => brotliCompressSync(file.contents).byteLength)
);

const images = files.filter((file) => imageExtensions.has(file.extension));
const largestImage = images.reduce(
    (largest, image) => image.contents.byteLength > largest.contents.byteLength ? image : largest,
    { name: 'none', contents: Buffer.alloc(0) }
);
const measurements = {
    javascriptBrotliKb: toKb(brotliSize('.js')),
    cssBrotliKb: toKb(brotliSize('.css')),
    totalImageKb: toKb(sum(images.map((image) => image.contents.byteLength))),
    largestImageKb: toKb(largestImage.contents.byteLength)
};

const labels = {
    javascriptBrotliKb: 'JavaScript Brotli',
    cssBrotliKb: 'CSS Brotli',
    totalImageKb: 'Total static images',
    largestImageKb: `Largest image (${largestImage.name})`
};
const failures = Object.entries(budgets)
    .filter(([key, limit]) => measurements[key] > limit)
    .map(([key, limit]) => `${labels[key]}: ${measurements[key]} KB exceeds ${limit} KB`);

console.table(Object.fromEntries(
    Object.keys(budgets).map((key) => [
        labels[key],
        { measuredKb: measurements[key], budgetKb: budgets[key] }
    ])
));

if (failures.length) {
    console.error(`Performance budget failed:\n- ${failures.join('\n- ')}`);
    process.exitCode = 1;
} else {
    console.log('Performance budget passed.');
}
