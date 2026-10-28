import { MAX_TRIAL_PHOTOS, normalizeTrialMetadata } from './photo-trial.mjs';

const DATABASE_NAME = 'ikkyee-photo-trial';
const STORE_NAME = 'drafts';
const GUEST_DRAFT_KEY = 'guest-three-photo-trial';
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

export class PhotoTrialStorageError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = 'PhotoTrialStorageError';
    }
}

function storageError(error) {
    return new PhotoTrialStorageError(
        '브라우저 저장소를 사용할 수 없어 로그인 후 사진을 이어갈 수 없습니다. 저장소 권한을 확인해 주세요.',
        { cause: error }
    );
}

function openDatabase(indexedDB) {
    if (!indexedDB?.open) return Promise.reject(storageError());
    return new Promise((resolve, reject) => {
        let request;
        try {
            request = indexedDB.open(DATABASE_NAME, 1);
        } catch (error) {
            reject(storageError(error));
            return;
        }
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                request.result.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(storageError(request.error));
        request.onblocked = () => reject(storageError(new Error('IndexedDB upgrade blocked')));
    });
}

function runRequest(database, mode, operation) {
    return new Promise((resolve, reject) => {
        let transaction;
        let request;
        let result;
        try {
            transaction = database.transaction(STORE_NAME, mode);
            request = operation(transaction.objectStore(STORE_NAME));
        } catch (error) {
            reject(storageError(error));
            return;
        }
        request.onsuccess = () => { result = request.result; };
        request.onerror = () => reject(storageError(request.error));
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(storageError(transaction.error));
        transaction.onabort = () => reject(storageError(transaction.error));
    });
}

function restoreFile(record) {
    const blob = record?.blob;
    if (!(blob instanceof Blob) || typeof record.name !== 'string') return null;
    if (typeof File === 'function') {
        return new File([blob], record.name, {
            type: record.type || blob.type,
            lastModified: Number(record.lastModified) || Date.now()
        });
    }
    const file = new Blob([blob], { type: record.type || blob.type });
    Object.defineProperties(file, {
        name: { value: record.name },
        lastModified: { value: Number(record.lastModified) || Date.now() }
    });
    return file;
}

function restoreItems(value) {
    if (!Array.isArray(value?.items) || value.items.length > MAX_TRIAL_PHOTOS) return null;
    const items = [];
    for (const record of value.items) {
        const file = restoreFile(record);
        if (!file || file.size > MAX_FILE_BYTES || typeof record.id !== 'string') return null;
        items.push({
            id: record.id,
            name: record.name,
            file,
            width: Number.isFinite(record.width) ? record.width : undefined,
            height: Number.isFinite(record.height) ? record.height : undefined,
            ...normalizeTrialMetadata(record)
        });
    }
    return items;
}

function restoreCurrentItems(value, now) {
    if (!Number.isFinite(value?.expiresAt) || value.expiresAt <= now()) return null;
    return restoreItems(value);
}

function ownerDraftKey(ownerId) {
    return ownerId === null || ownerId === undefined
        ? GUEST_DRAFT_KEY
        : `owner-three-photo-trial:${encodeURIComponent(String(ownerId))}`;
}

function hasSamePhotoIds(left, right) {
    if (left.length !== right.length) return false;
    const leftIds = left.map(({ id }) => id).sort();
    const rightIds = right.map(({ id }) => id).sort();
    return leftIds.every((id, index) => id === rightIds[index]);
}

function claimDraft(database, draftKey, now) {
    return new Promise((resolve, reject) => {
        let transaction;
        let ownerRequest;
        let guestRequest;
        let result = [];
        let conflict = null;
        let completedReads = 0;
        try {
            transaction = database.transaction(STORE_NAME, 'readwrite');
            const objectStore = transaction.objectStore(STORE_NAME);
            ownerRequest = objectStore.get(draftKey);
            guestRequest = objectStore.get(GUEST_DRAFT_KEY);

            const finishReads = () => {
                completedReads += 1;
                if (completedReads < 2) return;
                const restoredOwnerItems = restoreCurrentItems(ownerRequest.result, now);
                const restoredGuestItems = restoreCurrentItems(guestRequest.result, now);
                const ownerItems = restoredOwnerItems?.length ? restoredOwnerItems : null;
                const guestItems = restoredGuestItems?.length ? restoredGuestItems : null;
                if (ownerRequest.result !== undefined && !ownerItems) objectStore.delete(draftKey);
                if (guestRequest.result !== undefined && !guestItems) objectStore.delete(GUEST_DRAFT_KEY);

                if (!guestItems) {
                    result = ownerItems || [];
                    return;
                }
                if (!ownerItems) {
                    objectStore.put(guestRequest.result, draftKey);
                    objectStore.delete(GUEST_DRAFT_KEY);
                    result = guestItems;
                    return;
                }
                if (hasSamePhotoIds(ownerItems, guestItems)) {
                    objectStore.delete(GUEST_DRAFT_KEY);
                    result = ownerItems;
                    return;
                }
                conflict = new PhotoTrialStorageError(
                    '이 계정에 기존 체험 사진이 있어 로그인 전 사진을 합치지 않았습니다. 두 초안은 모두 유지됩니다.'
                );
            };
            ownerRequest.onsuccess = finishReads;
            guestRequest.onsuccess = finishReads;
            ownerRequest.onerror = () => reject(storageError(ownerRequest.error));
            guestRequest.onerror = () => reject(storageError(guestRequest.error));
        } catch (error) {
            reject(storageError(error));
            return;
        }
        transaction.oncomplete = () => conflict ? reject(conflict) : resolve(result);
        transaction.onerror = () => reject(storageError(transaction.error));
        transaction.onabort = () => reject(storageError(transaction.error));
    });
}

function serializeItems(items) {
    if (!Array.isArray(items) || items.length > MAX_TRIAL_PHOTOS) {
        throw new TypeError(`체험 사진은 최대 ${MAX_TRIAL_PHOTOS}장까지 저장할 수 있습니다.`);
    }
    return items.map((item) => {
        if (!(item.file instanceof Blob) || item.file.size > MAX_FILE_BYTES) {
            throw new TypeError('각 체험 사진은 15MB 이하의 이미지 파일이어야 합니다.');
        }
        return {
            id: String(item.id),
            name: String(item.name || item.file.name || 'photo'),
            type: String(item.file.type || ''),
            lastModified: Number(item.file.lastModified) || Date.now(),
            blob: item.file,
            width: Number.isFinite(item.width) ? item.width : undefined,
            height: Number.isFinite(item.height) ? item.height : undefined,
            ...normalizeTrialMetadata(item)
        };
    });
}

export function createPhotoTrialStore({ indexedDB = globalThis.indexedDB, now = Date.now, ownerId = null } = {}) {
    let databasePromise;
    const database = () => (databasePromise ||= openDatabase(indexedDB));
    const draftKey = ownerDraftKey(ownerId);

    async function clear() {
        return runRequest(await database(), 'readwrite', (store) => store.delete(draftKey));
    }

    return {
        async load() {
            const value = await runRequest(await database(), 'readonly', (store) => store.get(draftKey));
            if (value === undefined) return [];
            const items = restoreCurrentItems(value, now);
            if (!items) {
                await clear();
                return [];
            }
            return items;
        },
        async save(items) {
            const value = { expiresAt: now() + TTL_MS, items: serializeItems(items) };
            await runRequest(await database(), 'readwrite', (store) => store.put(value, draftKey));
        },
        async claimGuestDraft() {
            if (draftKey === GUEST_DRAFT_KEY) {
                throw new PhotoTrialStorageError('로그인한 계정에서만 로그인 전 체험 사진을 가져올 수 있습니다.');
            }
            return claimDraft(await database(), draftKey, now);
        },
        clear
    };
}
