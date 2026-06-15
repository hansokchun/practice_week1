import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    NEW_ACCOUNT_LIMIT_DAYS,
    getNewAccountLimitMessage,
    getNewAccountLimitStatus
} from '../js/new-account-limits.mjs';

const NOW = '2026-06-16T12:00:00Z';

test('new accounts are limited for the first seven days', () => {
    const status = getNewAccountLimitStatus({
        user: { id: 'user-1', created_at: '2026-06-12T00:00:00Z' },
        photos: [],
        now: NOW
    });

    assert.equal(NEW_ACCOUNT_LIMIT_DAYS, 7);
    assert.equal(status.isLimited, true);
    assert.equal(status.daysRemaining, 3);
});

test('older accounts are not limited', () => {
    const status = getNewAccountLimitStatus({
        user: { id: 'user-1', created_at: '2026-06-01T00:00:00Z' },
        photos: [],
        now: NOW,
        incomingUploadCount: 40,
        requestedVisibility: 'public'
    });

    assert.equal(status.isLimited, false);
    assert.equal(status.canUpload, true);
    assert.equal(status.canPublish, true);
});

test('new account upload limit counts only same-day owned uploads', () => {
    const status = getNewAccountLimitStatus({
        user: { id: 'user-1', created_at: '2026-06-16T02:00:00Z' },
        photos: [
            ...Array.from({ length: 18 }, (_, index) => ({ id: `today-${index}`, owner_id: 'user-1', created_at: '2026-06-16T04:00:00Z' })),
            { id: 'other-user', owner_id: 'user-2', created_at: '2026-06-16T04:00:00Z' },
            { id: 'yesterday', owner_id: 'user-1', created_at: '2026-06-15T23:00:00Z' }
        ],
        incomingUploadCount: 3,
        now: NOW
    });

    assert.equal(status.canUpload, false);
    assert.equal(status.uploadsRemainingToday, 2);
    assert.match(getNewAccountLimitMessage(status, 'upload'), /오늘은 2장까지만 더 업로드할 수 있어요/);
});

test('new account public limit blocks public sharing after five public photos', () => {
    const status = getNewAccountLimitStatus({
        user: { id: 'user-1', created_at: '2026-06-15T00:00:00Z' },
        photos: Array.from({ length: 5 }, (_, index) => ({ id: `public-${index}`, owner_id: 'user-1', visibility: 'public' })),
        now: NOW,
        requestedVisibility: 'public',
        incomingPublicCount: 1
    });

    assert.equal(status.canPublish, false);
    assert.equal(status.publicRemaining, 0);
    assert.match(getNewAccountLimitMessage(status, 'publish'), /신규 계정은 첫 7일 동안 공개 사진을 5장까지만/);
});
