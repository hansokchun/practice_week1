import assert from 'node:assert/strict';
import test from 'node:test';
import { gpsRationalsToDecimal, parseExifDate } from '../js/photo-exif-reader.mjs';

test('parseExifDate converts EXIF date strings to ISO strings', () => {
    assert.equal(parseExifDate('2026:05:29 14:03:12'), new Date('2026-05-29T14:03:12').toISOString());
});

test('parseExifDate returns null for invalid values', () => {
    assert.equal(parseExifDate('2026-05-29'), null);
    assert.equal(parseExifDate(''), null);
});

test('gpsRationalsToDecimal converts GPS DMS values', () => {
    assert.equal(gpsRationalsToDecimal([37, 33, 30], 'N'), 37.55833333333333);
    assert.equal(gpsRationalsToDecimal([126, 59, 15], 'W'), -126.9875);
});
