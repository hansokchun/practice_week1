function readAscii(view, offset, length) {
    let value = '';
    for (let index = 0; index < length; index += 1) {
        const code = view.getUint8(offset + index);
        if (code === 0) break;
        value += String.fromCharCode(code);
    }
    return value.trim();
}

function getTypeSize(type) {
    return { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1 }[type] || 0;
}

function readTagValue(view, tiffStart, entryOffset, littleEndian) {
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const count = view.getUint32(entryOffset + 4, littleEndian);
    const valueSize = getTypeSize(type) * count;
    const valueOffset = valueSize <= 4
        ? entryOffset + 8
        : tiffStart + view.getUint32(entryOffset + 8, littleEndian);

    if (type === 2) return readAscii(view, valueOffset, count);
    if (type === 3 && count === 1) return view.getUint16(valueOffset, littleEndian);
    if (type === 4 && count === 1) return view.getUint32(valueOffset, littleEndian);
    if (type === 5) {
        return Array.from({ length: count }, (_, index) => {
            const offset = valueOffset + index * 8;
            const numerator = view.getUint32(offset, littleEndian);
            const denominator = view.getUint32(offset + 4, littleEndian);
            return denominator ? numerator / denominator : 0;
        });
    }
    return null;
}

function readIfd(view, tiffStart, ifdOffset, littleEndian) {
    if (!ifdOffset) return new Map();
    const entryCount = view.getUint16(tiffStart + ifdOffset, littleEndian);
    const tags = new Map();
    for (let index = 0; index < entryCount; index += 1) {
        const entryOffset = tiffStart + ifdOffset + 2 + index * 12;
        const tag = view.getUint16(entryOffset, littleEndian);
        tags.set(tag, readTagValue(view, tiffStart, entryOffset, littleEndian));
    }
    return tags;
}

export function parseExifDate(value) {
    const match = String(value || '').match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (!match) return null;
    const [, year, month, day, hour, minute, second] = match;
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).toISOString();
}

export function gpsRationalsToDecimal(values, ref) {
    if (!Array.isArray(values) || values.length < 3) return null;
    const decimal = values[0] + values[1] / 60 + values[2] / 3600;
    return ['S', 'W'].includes(String(ref || '').toUpperCase()) ? -decimal : decimal;
}

export async function readPhotoExif(file) {
    if (!file || !/^image\/jpe?g$/i.test(file.type || '')) {
        return { date: null, lat: null, lng: null };
    }

    const view = new DataView(await file.arrayBuffer());
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
        return { date: null, lat: null, lng: null };
    }

    let offset = 2;
    while (offset + 4 < view.byteLength) {
        if (view.getUint8(offset) !== 0xff) break;
        const marker = view.getUint8(offset + 1);
        const segmentLength = view.getUint16(offset + 2);
        const segmentStart = offset + 4;
        if (marker === 0xe1 && readAscii(view, segmentStart, 6) === 'Exif') {
            const tiffStart = segmentStart + 6;
            const byteOrder = readAscii(view, tiffStart, 2);
            const littleEndian = byteOrder === 'II';
            const firstIfdOffset = view.getUint32(tiffStart + 4, littleEndian);
            const ifd0 = readIfd(view, tiffStart, firstIfdOffset, littleEndian);
            const exifIfd = readIfd(view, tiffStart, Number(ifd0.get(0x8769) || 0), littleEndian);
            const gpsIfd = readIfd(view, tiffStart, Number(ifd0.get(0x8825) || 0), littleEndian);

            return {
                date: parseExifDate(exifIfd.get(0x9003) || ifd0.get(0x0132)),
                lat: gpsRationalsToDecimal(gpsIfd.get(0x0002), gpsIfd.get(0x0001)),
                lng: gpsRationalsToDecimal(gpsIfd.get(0x0004), gpsIfd.get(0x0003))
            };
        }
        offset += 2 + segmentLength;
    }

    return { date: null, lat: null, lng: null };
}
