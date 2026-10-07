import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildAccountNotificationItems } from '../js/account-notifications.mjs';

test('account notifications summarize missing locations, liked photos, and received likes', () => {
    const items = buildAccountNotificationItems({
        currentUserId: 'me',
        likedPhotoIds: ['liked'],
        savedPhotos: [
            { id: 'missing', owner_id: 'me', lat: null, lng: null, visibility: 'private' },
            { id: 'public', owner_id: 'me', lat: 37.5, lng: 127, visibility: 'public', liked: 7 },
            { id: 'liked', owner_id: 'other', lat: 35, lng: 129, visibility: 'public' }
        ]
    });

    assert.deepEqual(items.map((item) => item.route), ['location-assign', 'liked', 'photos']);
    assert.equal(items[0].icon, 'location_off');
    assert.equal(items[0].title, '1장의 사진에 위치를 지정해보세요!');
    assert.equal(items[1].title, '좋아요 누른 사진 1장');
    assert.equal(items[2].title, '7개의 좋아요를 받았어요!');
    assert.ok(items.every(item => !item.title.includes('공개 중')));
});

test('dismissing the page banner keeps unresolved photos in notifications', () => {
    const dismissedItems = buildAccountNotificationItems({
        currentUserId: 'me',
        savedPhotos: [{ id: 'missing', owner_id: 'me', lat: null, lng: null }],
        isMissingLocationBannerDismissed: true
    });
    const loggedOutItems = buildAccountNotificationItems({
        savedPhotos: [{ id: 'public', owner_id: 'me', visibility: 'public' }]
    });

    assert.equal(dismissedItems.length, 1);
    assert.equal(dismissedItems[0].title, '1장의 사진에 위치를 지정해보세요!');
    assert.equal(dismissedItems[0].route, 'location-assign');
    assert.deepEqual(loggedOutItems, []);
});

test('notification preferences can hide location guidance and library summaries', () => {
    const photos = [
        { id: 'missing', owner_id: 'me', lat: null, lng: null },
        { id: 'public', owner_id: 'me', lat: 37.5, lng: 127, visibility: 'public', liked: 2 }
    ];
    const locationOnly = buildAccountNotificationItems({
        currentUserId: 'me',
        savedPhotos: photos,
        librarySummaryNotifications: false
    });
    const summaryOnly = buildAccountNotificationItems({
        currentUserId: 'me',
        savedPhotos: photos,
        missingLocationNotifications: false
    });

    assert.deepEqual(locationOnly.map((item) => item.title), ['1장의 사진에 위치를 지정해보세요!']);
    assert.deepEqual(summaryOnly.map((item) => item.title), ['2개의 좋아요를 받았어요!']);
});

test('public photo counts alone do not create notifications', () => {
    const items = buildAccountNotificationItems({
        currentUserId: 'me',
        savedPhotos: [{ id: 'public', owner_id: 'me', lat: 37, lng: 127, visibility: 'public' }]
    });
    assert.equal(items[0].title, '새 알림 없음');
});

test('missing photos accumulate across reloads until explicitly skipped or located', () => {
    const savedPhotos = [
        { id: 'old', owner_id: 'me', lat: null, lng: null, date: '2020-01-01' },
        { id: 'new', owner_id: 'me', lat: null, lng: null, date: '2026-10-08' },
        { id: 'skipped', owner_id: 'me', lat: null, lng: null, location_assignment_skipped: true },
        { id: 'other', owner_id: 'other', lat: null, lng: null }
    ];
    const reload = () => buildAccountNotificationItems({ currentUserId: 'me', savedPhotos: JSON.parse(JSON.stringify(savedPhotos)) });
    assert.equal(reload()[0].title, '2장의 사진에 위치를 지정해보세요!');
    assert.equal(reload()[0].route, 'location-assign');
    savedPhotos[0].location_assignment_skipped = true;
    assert.equal(reload()[0].title, '1장의 사진에 위치를 지정해보세요!');
    Object.assign(savedPhotos[1], { lat: 37, lng: 127 });
    assert.equal(reload()[0].title, '새 알림 없음');
});

test('unusable and partial coordinates stay in the location editing queue', () => {
    const items = buildAccountNotificationItems({ currentUserId: 'me', savedPhotos: [
        { id: 'zero', owner_id: 'me', lat: 0, lng: 0 },
        { id: 'partial', owner_id: 'me', lat: 37, lng: null },
        { id: 'invalid', owner_id: 'me', lat: 100, lng: 127 }
    ] });
    assert.equal(items[0].title, '3장의 사진에 위치를 지정해보세요!');
});
