import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
    getLandingAdminPhotoCandidates,
    getLandingAdminSelectedPhotoIds
} from '../js/landing-admin-photo-candidates.mjs';

test('landing admin candidates contain only photos liked by the admin and already public', () => {
    const photos = [
        { id: 'liked-public', visibility: 'public' },
        { id: 'unliked-public', visibility: 'public' },
        { id: 'liked-private', visibility: 'private' },
        { id: 'liked-shared', shared: true },
        { id: 'liked-public', visibility: 'public' }
    ];

    assert.deepEqual(
        getLandingAdminPhotoCandidates(photos, ['liked-public', 'liked-private', 'liked-shared']).map(({ id }) => id),
        ['liked-public', 'liked-shared']
    );
});

test('landing admin removes unliked selections and preserves eligible selection order', () => {
    const candidates = [
        { id: 'a', visibility: 'public' },
        { id: 'b', visibility: 'public' }
    ];

    assert.deepEqual(
        getLandingAdminSelectedPhotoIds(['missing', 'b', 'a', 'b'], candidates, 2),
        ['b', 'a']
    );
});

test('landing admin explains that photo choices come from the admins liked photos', () => {
    const html = readFileSync('index.html', 'utf8');
    const app = readFileSync('js/app.js', 'utf8');

    assert.match(html, /관리자가 좋아요한 공개 사진/u);
    assert.match(app, /function getLandingAdminLikedPhotoCandidates\(\)/u);
    assert.match(app, /getLandingAdminPhotoCandidates\(getLandingPublicPhotos\(\), state\.likedPhotoIds\)/u);
    assert.match(app, /지도에서 공개 사진에 좋아요를 누르면 선택 후보에 나타납니다\./u);
});
