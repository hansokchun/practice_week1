import { hasUsableCoordinates } from './photo-location.mjs';

export const MAX_TRIAL_PHOTOS = 3;

export function isGuestPhotoTrialUpload(photos = []) {
    return photos.length > 0 && photos.length <= MAX_TRIAL_PHOTOS
        && photos.every(photo => typeof photo.trialId === 'string' && photo.trialId && photo.file instanceof Blob);
}

export function selectPhotoTrialUpload(items, selectedIds) {
    if (!Array.isArray(selectedIds) || !selectedIds.length || selectedIds.length > MAX_TRIAL_PHOTOS
        || new Set(selectedIds).size !== selectedIds.length) {
        throw new Error('저장할 사진을 다시 선택해 주세요.');
    }
    const photosById = new Map(items.map(photo => [String(photo.id), photo]));
    const selected = selectedIds.map(id => photosById.get(String(id)));
    if (selected.some(photo => !photo)) throw new Error('선택한 사진이 만료됐어요. 사진을 다시 골라 주세요.');
    return selected;
}

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
