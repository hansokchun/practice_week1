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
    assert.deepEqual(ids(sortPersonalPhotos(photos, 'uploaded-oldest')), ['c', 'b', 'a']);
    assert.deepEqual(ids(sortPersonalPhotos(photos, 'taken-newest')), ['b', 'c', 'a']);
    assert.deepEqual(ids(sortPersonalPhotos(photos, 'taken-oldest')), ['a', 'c', 'b']);
    assert.deepEqual(ids(photos), ['a', 'b', 'c']);
    assert.equal(sortPersonalPhotos(photos)[0], photos[0]);
});

test('most liked uses received totals, with deterministic registration-date ties', () => {
    assert.deepEqual(ids(sortPersonalPhotos(photos, 'most-liked')), ['b', 'c', 'a']);
    const tied = photos.map(photo => ({ ...photo, liked: '5' }));
    assert.deepEqual(ids(sortPersonalPhotos(tied, 'most-liked')), ['a', 'b', 'c']);
    assert.deepEqual(ids(sortPersonalPhotos([tied[2], tied[0], tied[1]], 'most-liked')), ['a', 'b', 'c']);
});

test('unknown dates sort last in both directions and invalid like totals act as zero', () => {
    const items = [{ id: 'unknown', date: null }, { id: 'broken', date: 'invalid' }, { id: 'dated', date: '1970-01-01' }];
    for (const order of ['taken-newest', 'taken-oldest']) {
        assert.equal(sortPersonalPhotos(items, order)[0].id, 'dated');
    }
    assert.equal(sortPersonalPhotos([{ id: 'bad', liked: Infinity }, { id: 'valid', liked: 1 }], 'most-liked')[0].id, 'valid');
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
    const items = Array.from({ length: 20 }, (_, index) => ({ id: String(index), liked: index }));
    const sorted = sortPersonalPhotos(items, 'most-liked');
    assert.equal(getPhotoPage(sorted, 1).items[0].id, '19');
    assert.deepEqual(ids(getPhotoPage(sorted, 2).items), ['3', '2', '1', '0']);
});

test('sort preferences stay account-scoped and storage failures do not block sorting', () => {
    const values = new Map();
    const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
    assert.equal(savePersonalPhotoSort(storage, 'owner-a', 'most-liked'), 'most-liked');
    assert.equal(loadPersonalPhotoSort(storage, 'owner-a'), 'most-liked');
    assert.equal(loadPersonalPhotoSort(storage, 'owner-b'), DEFAULT_PERSONAL_PHOTO_SORT);
    assert.equal(loadPersonalPhotoSort(storage, ''), DEFAULT_PERSONAL_PHOTO_SORT);
    savePersonalPhotoSort(storage, '', 'taken-oldest');
    assert.equal(values.size, 1);
    const blocked = { getItem() { throw new Error('unavailable'); }, setItem() { throw new Error('unavailable'); } };
    assert.equal(loadPersonalPhotoSort(blocked, 'owner-a'), DEFAULT_PERSONAL_PHOTO_SORT);
    assert.equal(savePersonalPhotoSort(blocked, 'owner-a', 'taken-oldest'), 'taken-oldest');
});
