import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getProfilePhotoPreview } from '../js/profile-photo-preview.mjs';

const photos = Array.from({ length: 12 }, (_, index) => ({ id: `photo-${index + 1}` }));

test('profile photo preview returns at most seven shuffled photos', () => {
    const preview = getProfilePhotoPreview(photos, { seed: 'owner-1' });

    assert.equal(preview.length, 7);
    assert.equal(new Set(preview.map((photo) => photo.id)).size, 7);
    assert.notDeepEqual(preview, photos.slice(0, 7));
});

test('profile photo preview stays stable for the same owner seed', () => {
    assert.deepEqual(
        getProfilePhotoPreview(photos, { seed: 'owner-1' }),
        getProfilePhotoPreview(photos, { seed: 'owner-1' })
    );
});

test('profile photo preview keeps every photo when there are seven or fewer', () => {
    const shortList = photos.slice(0, 4);
    const preview = getProfilePhotoPreview(shortList, { seed: 'owner-1' });

    assert.equal(preview.length, 4);
    assert.deepEqual(new Set(preview), new Set(shortList));
});
