import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createNativeBrandDownloadsPlugin } from '../scripts/native-brand-downloads.mjs';

test('native bundles omit standalone brand downloads and retain application assets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ikkyee-native-brand-test-'));
    try {
        await mkdir(join(root, 'www/brand/animation'), { recursive: true });
        await mkdir(join(root, 'www/assets'), { recursive: true });
        await writeFile(join(root, 'www/brand/animation/logo.mov'), 'download only');
        await writeFile(join(root, 'www/assets/logo.png'), 'app logo');
        const plugin = createNativeBrandDownloadsPlugin();
        plugin.configResolved({ root, mode: 'native', build: { outDir: 'www' } });
        await plugin.closeBundle();
        await assert.rejects(readFile(join(root, 'www/brand/animation/logo.mov')), { code: 'ENOENT' });
        assert.equal(await readFile(join(root, 'www/assets/logo.png'), 'utf8'), 'app logo');
    } finally { await rm(root, { recursive: true, force: true }); }
});

test('web builds keep all downloadable brand assets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ikkyee-web-brand-test-'));
    try {
        await mkdir(join(root, 'dist/brand'), { recursive: true });
        await writeFile(join(root, 'dist/brand/logo.mov'), 'download');
        const plugin = createNativeBrandDownloadsPlugin();
        plugin.configResolved({ root, mode: 'native', build: { outDir: 'dist' } });
        plugin.configResolved({ root, mode: 'production', build: { outDir: 'dist' } });
        await plugin.closeBundle();
        assert.equal(await readFile(join(root, 'dist/brand/logo.mov'), 'utf8'), 'download');
    } finally { await rm(root, { recursive: true, force: true }); }
});
