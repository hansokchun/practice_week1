import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowHeaderMapDot, getHeaderUploadAction } from '../js/guest-map-entry.mjs';
import { isGuestPhotoTrialUpload, selectPhotoTrialUpload } from '../js/photo-trial.mjs';

test('header action keeps the map name and icon together and restores the member photo action', () => {
    assert.deepEqual(getHeaderUploadAction(null), { label: '나만의 지도 만들기', icon: 'map' });
    assert.deepEqual(getHeaderUploadAction({ id: 'member' }), { label: '사진 추가', icon: 'add_a_photo' });
    assert.deepEqual(getHeaderUploadAction(undefined), { label: '나만의 지도 만들기', icon: 'map' });
});

test('the header map dot appears for resolved guests on every route, never for members or while booting', () => {
    assert.equal(shouldShowHeaderMapDot(), false);
    assert.equal(shouldShowHeaderMapDot({ sessionReady: false }), false);
    for (const route of ['landing', 'home', 'explore', 'photos']) {
        assert.equal(shouldShowHeaderMapDot({ route, sessionReady: true }), true);
        assert.equal(shouldShowHeaderMapDot({ route, sessionReady: true, currentUser: { id: 'member' } }), false);
    }
});

test('guest upload review accepts only a bounded local trial queue', () => {
    const file = new Blob(['sample'], { type: 'image/jpeg' });
    const photo = { trialId: 'trial-1', file };
    assert.equal(isGuestPhotoTrialUpload([photo]), true);
    assert.equal(isGuestPhotoTrialUpload([]), false);
    assert.equal(isGuestPhotoTrialUpload([photo, { file }]), false);
    assert.equal(isGuestPhotoTrialUpload([{ trialId: 'trial-1' }]), false);
    assert.equal(isGuestPhotoTrialUpload(Array.from({ length: 4 }, (_, i) => ({ ...photo, trialId: `id-${i}` }))), false);
});

test('auth return restores exactly the selected draft photos and rejects missing selections', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    assert.deepEqual(selectPhotoTrialUpload(items, ['c', 'a']), [items[2], items[0]]);
    assert.throws(() => selectPhotoTrialUpload(items, ['deleted']), /사진/);
    assert.throws(() => selectPhotoTrialUpload(items, []), /사진/);
    assert.throws(() => selectPhotoTrialUpload(items, ['a', 'a']), /사진/);
    assert.deepEqual(items.map(item => item.id), ['a', 'b', 'c']);
});
