import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import piexif from 'piexifjs';

import {
    decimalDegreesToExifDms,
    getPhotoDownloadFileName,
    getPhotoDownloadPlan,
    insertGpsExifIntoJpegDataUrl
} from '../js/photo-download.mjs';

test('photo download converts decimal coordinates to EXIF degree-minute-second rationals', () => {
    assert.deepEqual(decimalDegreesToExifDms(37.579617), [
        [37, 1],
        [34, 1],
        [466212, 10000]
    ]);
    assert.deepEqual(decimalDegreesToExifDms(-122.4194), [
        [122, 1],
        [25, 1],
        [98400, 10000]
    ]);
});

test('photo download plan embeds valid stored coordinates and exports non-JPEG images as JPEG', () => {
    assert.deepEqual(getPhotoDownloadPlan({
        id: 'photo-7',
        description: '경복궁 야경',
        url: 'https://example.com/photo.webp',
        lat: 37.579617,
        lng: 126.977041
    }, 'image/webp'), {
        sourceUrl: 'https://example.com/photo.webp',
        fileName: '경복궁-야경-location.jpg',
        outputMimeType: 'image/jpeg',
        shouldConvertToJpeg: true,
        gps: {
            latitudeRef: 'N',
            latitude: [[37, 1], [34, 1], [466212, 10000]],
            longitudeRef: 'E',
            longitude: [[126, 1], [58, 1], [373476, 10000]]
        }
    });
});

test('photo download keeps a JPEG file and skips GPS when the photo has no location', () => {
    assert.deepEqual(getPhotoDownloadPlan({
        id: 'photo-8',
        url: 'https://example.com/photo.jpg',
        lat: null,
        lng: null
    }, 'image/jpeg'), {
        sourceUrl: 'https://example.com/photo.jpg',
        fileName: 'ikkyee-photo-8.jpg',
        outputMimeType: 'image/jpeg',
        shouldConvertToJpeg: false,
        gps: null
    });
    assert.equal(getPhotoDownloadFileName({ id: 'a/b' }, 'image/png', false), 'ikkyee-a-b.png');
});

test('photo detail menu exposes and handles the download action', () => {
    const html = readFileSync('index.html', 'utf8');
    const source = readFileSync('js/app.js', 'utf8');
    const helperSource = readFileSync('js/photo-download.mjs', 'utf8');

    assert.match(html, /data-download-photo[^>]*>[\s\S]*?download[\s\S]*?다운로드/);
    assert.match(source, /event\.target\.closest\('\[data-download-photo\]'\)/);
    assert.match(source, /downloadSelectedPhoto\(/);
    assert.match(source, /insertGpsExifIntoJpegDataUrl/);
    assert.match(helperSource, /GPSIFD\.GPSLatitude/);
    assert.match(helperSource, /GPSIFD\.GPSLongitude/);
});

test('photo download writes GPS tags into a real JPEG payload', () => {
    const source = readFileSync('images/main_bg1.jpg').toString('base64');
    const sourceDataUrl = `data:image/jpeg;base64,${source}`;
    const gps = getPhotoDownloadPlan({
        url: 'photo.jpg',
        lat: 37.579617,
        lng: 126.977041
    }, 'image/jpeg').gps;
    const result = insertGpsExifIntoJpegDataUrl(sourceDataUrl, gps, piexif);
    const exif = piexif.load(result);

    assert.equal(exif.GPS[piexif.GPSIFD.GPSLatitudeRef], 'N');
    assert.deepEqual(exif.GPS[piexif.GPSIFD.GPSLatitude], gps.latitude);
    assert.equal(exif.GPS[piexif.GPSIFD.GPSLongitudeRef], 'E');
    assert.deepEqual(exif.GPS[piexif.GPSIFD.GPSLongitude], gps.longitude);
});
