import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getProfilePhotoMetrics } from '../js/profile-photo-metrics.mjs';

test('profile metrics count owned photos, public photos, and received likes', () => {
    assert.deepEqual(getProfilePhotoMetrics([
        { owner_id: 'me', visibility: 'public', liked: 3 },
        { owner_id: 'me', visibility: 'private', liked: 2 },
        { owner_id: 'me', visibility: 'link', liked: 1 },
        { owner_id: 'other', visibility: 'public', liked: 100 }
    ], 'me'), { photoCount: 3, publicCount: 1, receivedLikeCount: 6 });
});

test('profile metrics handle missing and invalid like totals', () => {
    assert.deepEqual(getProfilePhotoMetrics([
        { owner_id: 'me', shared: true },
        { owner_id: 'me', liked: -4 },
        { owner_id: 'me', liked: 'invalid' },
        { owner_id: 'me', liked: '4' }
    ], 'me'), { photoCount: 4, publicCount: 1, receivedLikeCount: 4 });
    assert.deepEqual(getProfilePhotoMetrics([], ''), { photoCount: 0, publicCount: 0, receivedLikeCount: 0 });
});
