import test from 'node:test';
import assert from 'node:assert/strict';

import { createPhotoTrialStore } from '../js/photo-trial-store.mjs';

function createFakeIndexedDb() {
    const records = new Map();
    const db = {
        objectStoreNames: { contains: () => true },
        transaction() {
            const transaction = {
                pending: 0,
                completed: false,
                objectStore() {
                    return {
                        get(key) { return request(() => records.get(key), transaction); },
                        put(value, key) { return request(() => records.set(key, value), transaction); },
                        delete(key) { return request(() => records.delete(key), transaction); }
                    };
                }
            };
            return transaction;
        }
    };
    function request(action, transaction) {
        const result = {};
        if (transaction) transaction.pending += 1;
        queueMicrotask(() => {
            try {
                result.result = action();
                result.onsuccess?.();
            } catch (error) {
                result.error = error;
                result.onerror?.();
                transaction?.onerror?.();
            } finally {
                if (transaction) {
                    transaction.pending -= 1;
                    queueMicrotask(() => {
                        if (!transaction.completed && transaction.pending === 0) {
                            transaction.completed = true;
                            transaction.oncomplete?.();
                        }
                    });
                }
            }
        });
        return result;
    }
    return {
        open() {
            const result = request(() => db, null);
            queueMicrotask(() => result.onupgradeneeded?.());
            return result;
        },
        records
    };
}

function draftPhoto(id) {
    const file = new Blob([id], { type: 'image/jpeg' });
    Object.defineProperty(file, 'name', { value: `${id}.jpg` });
    return { id, name: `${id}.jpg`, file };
}

test('photo trial store restores browser blobs as named files after reload', async () => {
    // Given
    const indexedDB = createFakeIndexedDb();
    const store = createPhotoTrialStore({ indexedDB, now: () => 1_000 });
    const file = new Blob(['jpeg'], { type: 'image/jpeg' });
    Object.defineProperties(file, { name: { value: 'seoul.jpg' }, lastModified: { value: 500 } });

    // When
    await store.save([{ id: 'one', name: 'seoul.jpg', file, date: null, lat: 37.5, lng: 127, geo_source: 'manual' }]);
    const restored = await createPhotoTrialStore({ indexedDB, now: () => 2_000 }).load();

    // Then
    assert.equal(restored.length, 1);
    assert.equal(restored[0].file.name, 'seoul.jpg');
    assert.equal(await restored[0].file.text(), 'jpeg');
    assert.equal(restored[0].geo_source, 'manual');
});

test('photo trial store removes a draft after its 24 hour TTL', async () => {
    // Given
    const indexedDB = createFakeIndexedDb();
    const store = createPhotoTrialStore({ indexedDB, now: () => 10 });
    const file = new Blob(['jpeg'], { type: 'image/jpeg' });
    Object.defineProperty(file, 'name', { value: 'old.jpg' });
    await store.save([{ id: 'old', name: 'old.jpg', file }]);

    // When
    const restored = await createPhotoTrialStore({ indexedDB, now: () => 86_400_011 }).load();

    // Then
    assert.deepEqual(restored, []);
    assert.equal(indexedDB.records.size, 0);
});

test('photo trial store reports unavailable IndexedDB instead of silently losing OAuth drafts', async () => {
    // Given
    const store = createPhotoTrialStore({ indexedDB: undefined, now: () => 1 });

    // When / Then
    await assert.rejects(() => store.save([]), /브라우저 저장소/);
    await assert.rejects(() => store.load(), /브라우저 저장소/);
});

test('photo trial store preserves an explicit location-assignment skip across reload', async () => {
    // Given
    const indexedDB = createFakeIndexedDb();
    const file = new Blob(['jpeg'], { type: 'image/jpeg' });
    Object.defineProperty(file, 'name', { value: 'private-location.jpg' });
    const store = createPhotoTrialStore({ indexedDB, now: () => 1 });
    await store.save([{
        id: 'skip',
        name: 'private-location.jpg',
        file,
        lat: 37.5,
        lng: 127.1,
        geo_source: 'exif',
        location_assignment_skipped: true
    }]);

    // When
    const [restored] = await createPhotoTrialStore({ indexedDB, now: () => 2 }).load();

    // Then
    assert.equal(restored.location_assignment_skipped, true);
    assert.equal(restored.lat, null);
    assert.equal(restored.lng, null);
});

test('photo trial store isolates account A, guest, and account B drafts', async () => {
    // Given
    const indexedDB = createFakeIndexedDb();
    const accountA = createPhotoTrialStore({ indexedDB, now: () => 1, ownerId: 'account-a' });
    const guest = createPhotoTrialStore({ indexedDB, now: () => 1, ownerId: null });
    const accountB = createPhotoTrialStore({ indexedDB, now: () => 1, ownerId: 'account-b' });

    // When
    await accountA.save([draftPhoto('a')]);
    await guest.save([draftPhoto('guest')]);
    await accountB.save([draftPhoto('b')]);

    // Then
    assert.deepEqual((await accountA.load()).map(({ id }) => id), ['a']);
    assert.deepEqual((await guest.load()).map(({ id }) => id), ['guest']);
    assert.deepEqual((await accountB.load()).map(({ id }) => id), ['b']);
});

test('authenticated store claims a guest draft only through explicit claimGuestDraft', async () => {
    // Given
    const indexedDB = createFakeIndexedDb();
    const guest = createPhotoTrialStore({ indexedDB, now: () => 1, ownerId: null });
    const accountA = createPhotoTrialStore({ indexedDB, now: () => 1, ownerId: 'account-a' });
    await guest.save([draftPhoto('guest')]);
    assert.deepEqual(await accountA.load(), []);

    // When
    const claimed = await accountA.claimGuestDraft();

    // Then
    assert.deepEqual(claimed.map(({ id }) => id), ['guest']);
    assert.deepEqual((await accountA.load()).map(({ id }) => id), ['guest']);
    assert.deepEqual(await guest.load(), []);
});

test('claimGuestDraft preserves conflicting guest and owner drafts', async () => {
    // Given
    const indexedDB = createFakeIndexedDb();
    const guest = createPhotoTrialStore({ indexedDB, now: () => 1, ownerId: null });
    const accountA = createPhotoTrialStore({ indexedDB, now: () => 1, ownerId: 'account-a' });
    await guest.save([draftPhoto('guest')]);
    await accountA.save([draftPhoto('owned')]);

    // When / Then
    await assert.rejects(() => accountA.claimGuestDraft(), /기존.*체험 사진/);
    assert.deepEqual((await guest.load()).map(({ id }) => id), ['guest']);
    assert.deepEqual((await accountA.load()).map(({ id }) => id), ['owned']);
});

test('claimGuestDraft is idempotent for the same photo ids and unavailable to guests', async () => {
    // Given
    const indexedDB = createFakeIndexedDb();
    const guest = createPhotoTrialStore({ indexedDB, now: () => 1, ownerId: null });
    const accountA = createPhotoTrialStore({ indexedDB, now: () => 1, ownerId: 'account-a' });
    await guest.save([draftPhoto('same')]);
    await accountA.save([draftPhoto('same')]);

    // When
    const claimed = await accountA.claimGuestDraft();

    // Then
    assert.deepEqual(claimed.map(({ id }) => id), ['same']);
    assert.deepEqual(await guest.load(), []);
    await assert.rejects(() => guest.claimGuestDraft(), /로그인한 계정/);
});

test('claimGuestDraft discards an expired guest draft instead of adopting it', async () => {
    // Given
    const indexedDB = createFakeIndexedDb();
    const guest = createPhotoTrialStore({ indexedDB, now: () => 1, ownerId: null });
    await guest.save([draftPhoto('expired')]);
    const accountA = createPhotoTrialStore({ indexedDB, now: () => 86_400_002, ownerId: 'account-a' });

    // When
    const claimed = await accountA.claimGuestDraft();

    // Then
    assert.deepEqual(claimed, []);
    assert.deepEqual(await guest.load(), []);
});

test('claimGuestDraft replaces an empty owner record with a valid guest draft', async () => {
    // Given
    const indexedDB = createFakeIndexedDb();
    const guest = createPhotoTrialStore({ indexedDB, now: () => 1, ownerId: null });
    const accountA = createPhotoTrialStore({ indexedDB, now: () => 1, ownerId: 'account-a' });
    await accountA.save([]);
    await guest.save([draftPhoto('guest')]);

    // When
    const claimed = await accountA.claimGuestDraft();

    // Then
    assert.deepEqual(claimed.map(({ id }) => id), ['guest']);
    assert.deepEqual((await accountA.load()).map(({ id }) => id), ['guest']);
    assert.deepEqual(await guest.load(), []);
});

test('claimGuestDraft ignores an empty guest record and preserves a nonempty owner draft', async () => {
    // Given
    const indexedDB = createFakeIndexedDb();
    const guest = createPhotoTrialStore({ indexedDB, now: () => 1, ownerId: null });
    const accountA = createPhotoTrialStore({ indexedDB, now: () => 1, ownerId: 'account-a' });
    await accountA.save([draftPhoto('owned')]);
    await guest.save([]);

    // When
    const claimed = await accountA.claimGuestDraft();

    // Then
    assert.deepEqual(claimed.map(({ id }) => id), ['owned']);
    assert.deepEqual((await accountA.load()).map(({ id }) => id), ['owned']);
    assert.deepEqual(await guest.load(), []);
});
