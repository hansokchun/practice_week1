import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { compactPiexifForPhotoDownload } from '../scripts/compact-piexif.mjs';

const require = createRequire(import.meta.url);
const original = readFileSync(require.resolve('piexifjs'), 'utf8');
function library(source) {
    const context = { module: { exports: {} }, exports: {}, atob, btoa };
    vm.runInNewContext(source, context);
    return context.module.exports;
}

test('compacted EXIF library preserves the exact GPS and existing metadata round trip', () => {
    const full = library(original);
    const compact = library(compactPiexifForPhotoDownload(original));
    const metadata = {
        '0th': { [full.ImageIFD.Artist]: 'Ikkyee', [full.ImageIFD.ImageDescription]: 'Travel photo' },
        Exif: { [full.ExifIFD.DateTimeOriginal]: '2026:10:07 19:00:00', [full.ExifIFD.ExposureTime]: [1, 250] },
        GPS: { [full.GPSIFD.GPSVersionID]: [2, 3, 0, 0], [full.GPSIFD.GPSLatitudeRef]: 'S',
            [full.GPSIFD.GPSLatitude]: [[33, 1], [50, 1], [100, 100]],
            [full.GPSIFD.GPSLongitudeRef]: 'E', [full.GPSIFD.GPSLongitude]: [[151, 1], [12, 1], [0, 1]] }
    };
    const jpeg = 'data:image/jpeg;base64,' + readFileSync(new URL('../images/home-section-divider.jpg', import.meta.url)).toString('base64');
    assert.equal(compact.dump(metadata), full.dump(metadata));
    const output = compact.insert(compact.dump(metadata), jpeg);
    assert.equal(output, full.insert(full.dump(metadata), jpeg));
    assert.deepEqual(JSON.parse(JSON.stringify(compact.load(output))), JSON.parse(JSON.stringify(full.load(output))));
});

test('keeps tag types, required functions and license text while removing unused helpers', () => {
    const source = compactPiexifForPhotoDownload(original);
    const full = library(original);
    const compact = library(source);
    assert.match(source, /The MIT License/);
    for (const name of ['load', 'dump', 'insert']) assert.equal(typeof compact[name], 'function');
    for (const [ifd, tags] of Object.entries(full.TAGS)) {
        for (const [tag, descriptor] of Object.entries(tags)) assert.equal(compact.TAGS[ifd][tag].type, descriptor.type);
    }
    assert.equal(compact.remove, undefined);
    assert.equal(compact.GPSHelper, undefined);
});

test('fails visibly if a dependency update changes the supported source structure', () => {
    assert.throws(() => compactPiexifForPhotoDownload('export default {};'), /piexif/i);
});

test('photo download only uses the retained EXIF API', () => {
    const consumer = readFileSync(new URL('../js/photo-download.mjs', import.meta.url), 'utf8');
    const compact = library(compactPiexifForPhotoDownload(original));
    for (const match of consumer.matchAll(/piexif\.(\w+)(?:\.(\w+))?/g)) {
        assert.notEqual(compact[match[1]], undefined, match[0]);
        if (match[2]) assert.notEqual(compact[match[1]][match[2]], undefined, match[0]);
    }
});
