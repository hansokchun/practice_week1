import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

export function createNativeBrandDownloadsPlugin() {
    let directory;
    return {
        name: 'ikkyee-native-brand-downloads',
        apply: 'build',
        configResolved(config) {
            directory = config.mode === 'native' ? resolve(config.root, config.build.outDir, 'brand') : undefined;
        },
        async closeBundle() {
            // Brand videos and archives are hosted downloads, not application runtime assets.
            if (directory) await rm(directory, { recursive: true, force: true });
        }
    };
}
