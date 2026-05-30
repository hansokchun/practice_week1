import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    formatAlbumCount,
    formatDayCount,
    formatPhotoCount,
    formatPhotoPlaceMeta,
    formatPlaceCount
} from '../js/copy-formatters.mjs';

test('Korean count formatters keep photo, place, album, and day labels consistent', () => {
    assert.equal(formatPhotoCount(3), '3장');
    assert.equal(formatPlaceCount(2), '2곳');
    assert.equal(formatAlbumCount(4), '4개 앨범');
    assert.equal(formatDayCount(5), '5일');
    assert.equal(formatPhotoPlaceMeta(3, 2), '3장 · 2곳');
});
