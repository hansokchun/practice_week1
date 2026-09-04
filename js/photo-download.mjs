const MIME_EXTENSION = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
};

function hasDownloadCoordinates(photo) {
    if (photo?.lat === null || photo?.lat === undefined || photo?.lat === '') return false;
    if (photo?.lng === null || photo?.lng === undefined || photo?.lng === '') return false;
    const lat = Number(photo?.lat);
    const lng = Number(photo?.lng);
    return Number.isFinite(lat)
        && lat >= -90
        && lat <= 90
        && Number.isFinite(lng)
        && lng >= -180
        && lng <= 180;
}

function sanitizeDownloadName(value) {
    return String(value || '')
        .normalize('NFKC')
        .trim()
        .replace(/[^\p{L}\p{N}._-]+/gu, '-')
        .replace(/-+/g, '-')
        .replace(/^[-.]+|[-.]+$/g, '')
        .slice(0, 72);
}

export function decimalDegreesToExifDms(value) {
    const absolute = Math.abs(Number(value));
    if (!Number.isFinite(absolute)) return null;
    const degrees = Math.floor(absolute);
    const minutesWithFraction = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesWithFraction);
    const seconds = Math.round((minutesWithFraction - minutes) * 60 * 10000);
    return [[degrees, 1], [minutes, 1], [seconds, 10000]];
}

export function getPhotoDownloadFileName(photo, mimeType = 'image/jpeg', includeLocation = false) {
    const descriptiveName = sanitizeDownloadName(photo?.description || photo?.title || photo?.placeName);
    const fallbackId = sanitizeDownloadName(photo?.id || 'photo');
    const baseName = descriptiveName || `ikkyee-${fallbackId || 'photo'}`;
    const suffix = includeLocation ? '-location' : '';
    const extension = MIME_EXTENSION[mimeType] || 'jpg';
    return `${baseName}${suffix}.${extension}`;
}

export function getPhotoDownloadPlan(photo, sourceMimeType = 'image/jpeg') {
    const includeLocation = hasDownloadCoordinates(photo);
    const normalizedMimeType = MIME_EXTENSION[sourceMimeType] ? sourceMimeType : 'image/jpeg';
    const shouldConvertToJpeg = includeLocation && normalizedMimeType !== 'image/jpeg';
    const outputMimeType = shouldConvertToJpeg ? 'image/jpeg' : normalizedMimeType;
    const lat = Number(photo?.lat);
    const lng = Number(photo?.lng);

    return {
        sourceUrl: String(photo?.url || ''),
        fileName: getPhotoDownloadFileName(photo, outputMimeType, includeLocation),
        outputMimeType,
        shouldConvertToJpeg,
        gps: includeLocation ? {
            latitudeRef: lat < 0 ? 'S' : 'N',
            latitude: decimalDegreesToExifDms(lat),
            longitudeRef: lng < 0 ? 'W' : 'E',
            longitude: decimalDegreesToExifDms(lng)
        } : null
    };
}

export function insertGpsExifIntoJpegDataUrl(sourceDataUrl, gps, piexif) {
    if (!gps || !piexif?.GPSIFD) throw new Error('위치정보를 사진에 기록하지 못했습니다.');
    let exifData;
    try {
        exifData = piexif.load(sourceDataUrl);
    } catch (_) {
        exifData = { '0th': {}, Exif: {}, GPS: {}, Interop: {}, '1st': {}, thumbnail: null };
    }
    exifData.GPS ||= {};
    exifData.GPS[piexif.GPSIFD.GPSVersionID] = [2, 3, 0, 0];
    exifData.GPS[piexif.GPSIFD.GPSLatitudeRef] = gps.latitudeRef;
    exifData.GPS[piexif.GPSIFD.GPSLatitude] = gps.latitude;
    exifData.GPS[piexif.GPSIFD.GPSLongitudeRef] = gps.longitudeRef;
    exifData.GPS[piexif.GPSIFD.GPSLongitude] = gps.longitude;

    let exifBytes;
    try {
        exifBytes = piexif.dump(exifData);
    } catch (_) {
        exifBytes = piexif.dump({
            '0th': {},
            Exif: {},
            GPS: exifData.GPS,
            Interop: {},
            '1st': {},
            thumbnail: null
        });
    }
    return piexif.insert(exifBytes, sourceDataUrl);
}
