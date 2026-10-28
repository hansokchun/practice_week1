import test from 'node:test';
import assert from 'node:assert/strict';

import {
    MAX_TRIAL_PHOTOS,
    buildTrialUploadPhotos,
    getTrialUploadMetadata,
    normalizeTrialMetadata
} from '../js/photo-trial.mjs';

test('normalizeTrialMetadata rejects zero coordinates and keeps a valid date', () => {
    // Given
    const source = { date: '2026-10-29T01:02:03.000Z', lat: 0, lng: 0, geo_source: 'exif' };

    // When
    const metadata = normalizeTrialMetadata(source);

    // Then
    assert.deepEqual(metadata, {
        date: '2026-10-29T01:02:03.000Z',
        lat: null,
        lng: null,
        geo_source: null,
        location_precision: null,
        location_assignment_skipped: false
    });
});

test('getTrialUploadMetadata keeps a manual location over later EXIF data', () => {
    // Given
    const photo = { date: null, lat: 37.5, lng: 127.1, geo_source: 'manual', location_precision: 'pin' };
    const exif = { date: '2024-04-03T02:01:00.000Z', lat: 35.2, lng: 129.1 };

    // When
    const metadata = getTrialUploadMetadata(photo, exif);

    // Then
    assert.deepEqual(metadata, {
        date: '2024-04-03T02:01:00.000Z',
        lat: 37.5,
        lng: 127.1,
        geo_source: 'manual',
        location_precision: 'pin',
        location_assignment_skipped: false
    });
});

test('getTrialUploadMetadata prefers the real EXIF capture date over an existing file date', () => {
    // Given
    const photo = { date: '2026-10-29T00:00:00.000Z', lat: null, lng: null };
    const exif = { date: '2024-04-03T02:01:00.000Z', lat: null, lng: null };

    // When
    const metadata = getTrialUploadMetadata(photo, exif);

    // Then
    assert.equal(metadata.date, '2024-04-03T02:01:00.000Z');
});

test('getTrialUploadMetadata never restores EXIF coordinates after explicit location clearing', () => {
    // Given
    const photo = { location_assignment_skipped: true, lat: null, lng: null };
    const exif = { lat: 37.5, lng: 127.1 };

    // When
    const metadata = getTrialUploadMetadata(photo, exif);

    // Then
    assert.equal(metadata.lat, null);
    assert.equal(metadata.lng, null);
    assert.equal(metadata.location_assignment_skipped, true);
});

test('buildTrialUploadPhotos creates selected upload candidates without mutating trial items', () => {
    // Given
    const file = new Blob(['photo'], { type: 'image/jpeg' });
    const item = { id: 'abc', name: 'a.jpg', file, url: 'blob:preview', date: null, lat: null, lng: null };

    // When
    const result = buildTrialUploadPhotos([item], { createObjectUrl: () => 'blob:upload' });

    // Then
    assert.equal(MAX_TRIAL_PHOTOS, 3);
    assert.equal(result[0].localId, 'trial-abc');
    assert.equal(result[0].trialId, 'abc');
    assert.equal(result[0].selected, true);
    assert.equal(result[0].url, 'blob:upload');
    assert.equal(result[0].file, file);
    assert.equal(item.url, 'blob:preview');
});
