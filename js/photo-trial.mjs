import { hasUsableCoordinates } from './photo-location.mjs';

export const MAX_TRIAL_PHOTOS = 3;

function normalizeDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeTrialMetadata(source = {}) {
    const locationSkipped = source.location_assignment_skipped === true;
    const hasLocation = !locationSkipped && hasUsableCoordinates(source.lat, source.lng);
    const geoSource = hasLocation && ['exif', 'manual'].includes(source.geo_source)
        ? source.geo_source
        : null;
    return {
        date: normalizeDate(source.date),
        lat: hasLocation ? Number(source.lat) : null,
        lng: hasLocation ? Number(source.lng) : null,
        geo_source: geoSource,
        location_precision: geoSource
            ? String(source.location_precision || (geoSource === 'manual' ? 'pin' : 'exact'))
            : null,
        location_assignment_skipped: locationSkipped
    };
}

export function getTrialUploadMetadata(photo = {}, exif = {}) {
    const current = normalizeTrialMetadata(photo);
    const extracted = normalizeTrialMetadata({ ...exif, geo_source: 'exif' });
    const location = current.location_assignment_skipped
        ? current
        : current.geo_source === 'manual'
        ? current
        : (extracted.geo_source ? extracted : current);
    return {
        date: extracted.date || current.date,
        lat: location.lat,
        lng: location.lng,
        geo_source: location.geo_source,
        location_precision: location.location_precision,
        location_assignment_skipped: current.location_assignment_skipped
    };
}

export function buildTrialUploadPhotos(items = [], { createObjectUrl = URL.createObjectURL } = {}) {
    return items.slice(0, MAX_TRIAL_PHOTOS).map((item) => {
        const trialMetadata = getTrialUploadMetadata(item);
        return {
            ...item,
            ...trialMetadata,
            localId: `trial-${item.id}`,
            trialId: item.id,
            url: createObjectUrl(item.file),
            selected: true,
            trialMetadata
        };
    });
}
