import test from 'node:test';
import assert from 'node:assert/strict';
import { createGuestMapInvitationState } from '../js/guest-map-entry.mjs';
import { isGuestPhotoTrialUpload, selectPhotoTrialUpload } from '../js/photo-trial.mjs';

test('guest invitation appears on each home visit but never on landing or before session resolution', () => {
    const notice = createGuestMapInvitationState();
    assert.equal(notice.update({ route: 'home', sessionReady: false }), false);
    assert.equal(notice.update({ route: 'home', sessionReady: true }), true);
    notice.dismiss();
    assert.equal(notice.update({ route: 'home', sessionReady: true }), false);
    assert.equal(notice.update({ route: 'landing', sessionReady: true }), false);
    assert.equal(notice.update({ route: 'home', sessionReady: true }), true);
    assert.equal(notice.update({ route: 'home', sessionReady: true, currentUser: { id: 'member' } }), false);
    assert.equal(notice.update({ route: 'home', sessionReady: true }), true);
    assert.equal(createGuestMapInvitationState().update({ route: 'home', sessionReady: true }), true);
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
