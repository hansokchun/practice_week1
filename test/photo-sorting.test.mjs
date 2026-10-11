import assert from 'node:assert/strict';
import test from 'node:test';
import { getPhotoPage } from '../js/photo-pagination.mjs';
import {
    DEFAULT_PERSONAL_PHOTO_SORT,
    loadPersonalPhotoSort,
    normalizePersonalPhotoSort,
    savePersonalPhotoSort,
    sortPersonalPhotos
} from '../js/photo-sorting.mjs';

const photos = [
    { id: 'a', created_at: '2026-10-03', date: '2020-01-01', liked: 2 },
    { id: 'b', created_at: '2026-10-02', date: '2025-03-01', liked: 10 },
    { id: 'c', created_at: '2026-10-01', date: '2023-06-01', liked: 5 }
];
const ids = items => items.map(item => item.id);

test('registration and capture sorting use their own dates without mutating the library', () => {
    assert.deepEqual(ids(sortPersonalPhotos(photos)), ['a', 'b', 'c']);
    assert.deepEqual(ids(sortPersonalPhotos(photos, 'taken-newest')), ['b', 'c', 'a']);
    assert.deepEqual(ids(sortPersonalPhotos(photos, 'taken-oldest')), ['a', 'c', 'b']);
    assert.deepEqual(ids(photos), ['a', 'b', 'c']);
    assert.equal(sortPersonalPhotos(photos)[0], photos[0]);
});

test('removed sort preferences fall back to registration order when loaded or saved', () => {
    const values = new Map();
    const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
    for (const removed of ['uploaded-oldest', 'most-liked']) {
        assert.equal(normalizePersonalPhotoSort(removed), DEFAULT_PERSONAL_PHOTO_SORT);
        assert.deepEqual(ids(sortPersonalPhotos(photos, removed)), ['a', 'b', 'c']);
        values.set('ikkyee:photo-sort:owner', removed);
        assert.equal(loadPersonalPhotoSort(storage, 'owner'), DEFAULT_PERSONAL_PHOTO_SORT);
        assert.equal(savePersonalPhotoSort(storage, 'owner', removed), DEFAULT_PERSONAL_PHOTO_SORT);
        assert.equal(values.get('ikkyee:photo-sort:owner'), DEFAULT_PERSONAL_PHOTO_SORT);
    }
});

test('unknown dates sort last in both directions and unknown orders use registration order', () => {
    const items = [{ id: 'unknown', date: null }, { id: 'broken', date: 'invalid' }, { id: 'dated', date: '1970-01-01' }];
    for (const order of ['taken-newest', 'taken-oldest']) {
        assert.equal(sortPersonalPhotos(items, order)[0].id, 'dated');
    }
    assert.equal(normalizePersonalPhotoSort('unknown'), DEFAULT_PERSONAL_PHOTO_SORT);
    assert.equal(normalizePersonalPhotoSort(null), DEFAULT_PERSONAL_PHOTO_SORT);
    assert.deepEqual(sortPersonalPhotos(null), []);
});

test('same-date photos keep a stable ID order regardless of server row order', () => {
    const items = [{ id: 'photo-10', created_at: '2026-10-01' }, { id: 'photo-2', created_at: '2026-10-01' }];
    assert.deepEqual(ids(sortPersonalPhotos(items)), ['photo-2', 'photo-10']);
    assert.deepEqual(ids(sortPersonalPhotos([...items].reverse())), ['photo-2', 'photo-10']);
});

test('sorting happens before pagination, including photos outside the former first page', () => {
    const items = Array.from({ length: 20 }, (_, index) => ({ id: String(index), date: new Date(Date.UTC(2026, 0, index + 1)).toISOString() }));
    const sorted = sortPersonalPhotos(items, 'taken-newest');
    assert.equal(getPhotoPage(sorted, 1).items[0].id, '19');
    assert.deepEqual(ids(getPhotoPage(sorted, 2).items), ['3', '2', '1', '0']);
});

test('sort preferences stay account-scoped and storage failures do not block sorting', () => {
    const values = new Map();
    const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
    assert.equal(savePersonalPhotoSort(storage, 'owner-a', 'taken-newest'), 'taken-newest');
    assert.equal(loadPersonalPhotoSort(storage, 'owner-a'), 'taken-newest');
    assert.equal(loadPersonalPhotoSort(storage, 'owner-b'), DEFAULT_PERSONAL_PHOTO_SORT);
    assert.equal(loadPersonalPhotoSort(storage, ''), DEFAULT_PERSONAL_PHOTO_SORT);
    savePersonalPhotoSort(storage, '', 'taken-oldest');
    assert.equal(values.size, 1);
    const blocked = { getItem() { throw new Error('unavailable'); }, setItem() { throw new Error('unavailable'); } };
    assert.equal(loadPersonalPhotoSort(blocked, 'owner-a'), DEFAULT_PERSONAL_PHOTO_SORT);
    assert.equal(savePersonalPhotoSort(blocked, 'owner-a', 'taken-oldest'), 'taken-oldest');
});
