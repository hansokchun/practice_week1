import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildAccountNotificationItems } from '../js/account-notifications.mjs';

test('account notifications summarize missing, liked, and public photo states', () => {
    const items = buildAccountNotificationItems({
        currentUserId: 'me',
        likedPhotoIds: ['liked'],
        savedPhotos: [
            { id: 'missing', owner_id: 'me', lat: null, lng: null, visibility: 'private' },
            { id: 'public', owner_id: 'me', lat: 37.5, lng: 127, visibility: 'public' },
            { id: 'liked', owner_id: 'other', lat: 35, lng: 129, visibility: 'public' }
        ]
    });

    assert.deepEqual(items.map((item) => item.route), ['photos', 'liked', 'explore']);
    assert.equal(items[0].title, '위치 정보 없는 사진 1장');
    assert.equal(items[1].title, '좋아요한 사진 1장');
    assert.equal(items[2].title, '공개 중인 사진 1장');
});

test('dismissed missing-location guidance is omitted and an empty state is non-actionable', () => {
    const dismissedItems = buildAccountNotificationItems({
        currentUserId: 'me',
        savedPhotos: [{ id: 'missing', owner_id: 'me', lat: null, lng: null }],
        isMissingLocationBannerDismissed: true
    });
    const loggedOutItems = buildAccountNotificationItems({
        savedPhotos: [{ id: 'public', owner_id: 'me', visibility: 'public' }]
    });

    assert.equal(dismissedItems.length, 1);
    assert.equal(dismissedItems[0].title, '새 알림 없음');
    assert.equal(dismissedItems[0].route, '');
    assert.deepEqual(loggedOutItems, []);
});
