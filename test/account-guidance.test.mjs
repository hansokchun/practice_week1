import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeAccountGuidance, loadAccountGuidance, dismissAccountGuidance } from '../js/account-guidance.mjs';
import { buildAccountNotificationItems } from '../js/account-notifications.mjs';

function storage() {
    const values = new Map();
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('new accounts receive friendly location guidance and an actionable upload invitation', () => {
    const store = storage();
    const guidance = initializeAccountGuidance(store, 'new', true);
    const items = buildAccountNotificationItems({ currentUserId: 'new', welcomeNotices: guidance.welcomeNotices });
    assert.equal(items.length, 2);
    assert.match(items[0].body, /집·직장/);
    assert.equal(items[1].route, 'upload');
    assert.equal(items[1].title, '첫 사진으로 지도를 시작해보세요');
    assert.equal(items[1].body, '사진을 올리면 여행한 장소가 지도에 차곡차곡 쌓여요.');
    assert.equal(items[1].cta, '나만의 지도 만들기');
    assert.equal(items[1].featured, true);
    assert.deepEqual(loadAccountGuidance(store, 'new').welcomeNotices, guidance.welcomeNotices);
});

test('existing accounts do not receive a signup greeting', () => {
    assert.deepEqual(initializeAccountGuidance(storage(), 'old', false).welcomeNotices, []);
});

test('dismissed welcome notices stay dismissed without affecting another account', () => {
    const store = storage();
    initializeAccountGuidance(store, 'one', true);
    initializeAccountGuidance(store, 'two', true);
    dismissAccountGuidance(store, 'one', 'welcome-location');
    assert.deepEqual(initializeAccountGuidance(store, 'one', true).welcomeNotices.map(item => item.id), ['welcome-upload']);
    assert.equal(loadAccountGuidance(store, 'two').welcomeNotices.length, 2);
});

test('the upload notice remains visible until explicitly dismissed, across visits', () => {
    const store = storage();
    assert.equal(loadAccountGuidance(store, 'one').uploadNoticeDismissed, false);
    dismissAccountGuidance(store, 'one', 'upload-location');
    assert.equal(loadAccountGuidance(store, 'one').uploadNoticeDismissed, true);
    assert.equal(loadAccountGuidance(store, 'two').uploadNoticeDismissed, false);
});

test('invalid storage and unavailable storage do not break guidance rendering', () => {
    const broken = { getItem() { throw new Error('disabled'); }, setItem() { throw new Error('disabled'); } };
    assert.equal(initializeAccountGuidance(broken, 'new', true).welcomeNotices.length, 2);
    assert.equal(loadAccountGuidance(broken, 'new').uploadNoticeDismissed, false);
    assert.deepEqual(initializeAccountGuidance(null, '', true).welcomeNotices, []);
});
