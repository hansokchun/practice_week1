import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPhotoMetadataPages } from '../js/photo-metadata-pages.mjs';

function database(rows, { failAfter = Infinity, insertAfterFirst = null } = {}) {
    const requests = [];
    return { requests, from(table) {
        assert.equal(table, 'photos');
        let cursor = null;
        const query = {
            select(columns) { assert.equal(columns, 'id,date'); return query; },
            order(column, options) { assert.equal(column, 'id'); assert.equal(options.ascending, true); return query; },
            gt(column, value) { assert.equal(column, 'id'); cursor = value; return query; },
            async limit(size) {
                requests.push({ cursor, size });
                if (requests.length > failAfter) return { data: null, error: new Error('unavailable') };
                const data = rows.filter(row => cursor === null || row.id > cursor)
                    .sort((a, b) => a.id < b.id ? -1 : 1).slice(0, size);
                if (requests.length === 1 && insertAfterFirst) rows.push(insertAfterFirst);
                return { data, error: null };
            }
        };
        return query;
    } };
}

test('loads beyond the REST row limit in bounded requests, preserving newest date first', async () => {
    const rows = Array.from({ length: 1205 }, (_, index) => ({
        id: String(index).padStart(5, '0'), date: index % 2 ? '2026-10-07' : '2026-10-06'
    }));
    const sb = database(rows);
    const result = await fetchPhotoMetadataPages(sb, 'id,date');
    assert.equal(result.length, 1205);
    assert.equal(new Set(result.map(row => row.id)).size, 1205);
    assert.equal(result[0].date, '2026-10-07');
    assert.equal(result.at(-1).date, '2026-10-06');
    assert.ok(sb.requests.every(request => request.size <= 200));
});

test('uses a key cursor so inserting an earlier ID does not repeat previously loaded photos', async () => {
    const sb = database([{ id: 'b', date: '2' }, { id: 'c', date: '1' }, { id: 'd', date: '1' }],
        { insertAfterFirst: { id: 'a', date: '3' } });
    const result = await fetchPhotoMetadataPages(sb, 'id,date', 2);
    assert.deepEqual(result.map(row => row.id), ['b', 'c', 'd']);
    assert.equal(sb.requests[1].cursor, 'c');
});

test('empty libraries and a full final page terminate without missing rows', async () => {
    assert.deepEqual(await fetchPhotoMetadataPages(database([]), 'id,date'), []);
    const sb = database([{ id: 'a', date: null }, { id: 'b', date: '2026-01-01' }]);
    assert.equal((await fetchPhotoMetadataPages(sb, 'id,date', 2)).length, 2);
    assert.equal(sb.requests.length, 2);
});

test('later request failures reject instead of returning a successful partial library', async () => {
    const sb = database([{ id: 'a' }, { id: 'b' }, { id: 'c' }], { failAfter: 1 });
    await assert.rejects(fetchPhotoMetadataPages(sb, 'id,date', 2), /unavailable/);
});

test('rejects a non-advancing cursor instead of repeatedly requesting the same page', async () => {
    const query = { select() { return this; }, order() { return this; }, gt() { return this; },
        async limit() { return { data: [{ id: 'a' }], error: null }; } };
    await assert.rejects(fetchPhotoMetadataPages({ from: () => query }, 'id,date', 1), /cursor/i);
});
