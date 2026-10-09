import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

test('only the site owner account has unlimited photo uploads', () => {
    const ownerId = 'c46ae404-a8b3-4a13-8722-65b2f9d20c35';
    const photos = Array.from({ length: 150 }, (_, index) => ({ id: String(index), owner_id: ownerId }));
    const status = getAccountUploadLimitStatus({ user: { id: ownerId }, photos, incomingUploadCount: 7 });
    assert.equal(status.canUpload, true);
    assert.equal(status.photoLimit, Infinity);
    assert.equal(status.remainingUploads, Infinity);
    assert.equal(getAccountUploadLimitMessage(status), '');
    const otherAdmin = getAccountUploadLimitStatus({ user: { id: 'another-admin', app_metadata: { role: 'admin' } }, photos: Array.from({ length: 100 }, () => ({ owner_id: 'another-admin' })), incomingUploadCount: 1 });
    assert.equal(otherAdmin.canUpload, false);
    const sql = readFileSync('supabase/migrations/20261009173522_allow_admin_landing_uploads_and_seven_slides.sql', 'utf8');
    assert.match(sql, /viewer_id <> 'c46ae404-a8b3-4a13-8722-65b2f9d20c35'::uuid/);
    assert.match(sql, /photo_count >= 100/);
    assert.match(sql, /new\.owner_id is distinct from viewer_id/);
});

import {
    ACCOUNT_PHOTO_UPLOAD_LIMIT,
    getAccountUploadLimitMessage,
    getAccountUploadLimitStatus,
    getOwnedPhotoCount
} from '../js/upload-account-limit.mjs';

test('account upload limit counts only the current user photos', () => {
    const photos = [
        ...Array.from({ length: 98 }, (_, index) => ({ id: `own-${index}`, owner_id: 'user-1' })),
        { id: 'other-user-photo', owner_id: 'user-2' }
    ];

    assert.equal(ACCOUNT_PHOTO_UPLOAD_LIMIT, 100);
    assert.equal(getOwnedPhotoCount({ id: 'user-1' }, photos), 98);
});

test('account upload limit allows uploads within the remaining quota', () => {
    const status = getAccountUploadLimitStatus({
        user: { id: 'user-1' },
        photos: Array.from({ length: 97 }, (_, index) => ({ id: `own-${index}`, owner_id: 'user-1' })),
        incomingUploadCount: 3
    });

    assert.equal(status.ownedPhotoCount, 97);
    assert.equal(status.remainingUploads, 3);
    assert.equal(status.canUpload, true);
    assert.equal(getAccountUploadLimitMessage(status), '');
});

test('account upload limit blocks uploads over one hundred photos', () => {
    const status = getAccountUploadLimitStatus({
        user: { id: 'user-1' },
        photos: Array.from({ length: 99 }, (_, index) => ({ id: `own-${index}`, owner_id: 'user-1' })),
        incomingUploadCount: 2
    });

    assert.equal(status.ownedPhotoCount, 99);
    assert.equal(status.remainingUploads, 1);
    assert.equal(status.canUpload, false);
    assert.match(getAccountUploadLimitMessage(status), /\ucd5c\ub300 100\uc7a5/);
    assert.match(getAccountUploadLimitMessage(status), /\ub0a8\uc740 \uc5c5\ub85c\ub4dc \uac00\ub2a5 \uc218\ub294 1\uc7a5/);
});
