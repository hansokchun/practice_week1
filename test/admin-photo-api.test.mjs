import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminAccountsHandler } from '../supabase/functions/admin-accounts/handler.mjs';
import { createAdminAccountsRepository } from '../supabase/functions/admin-accounts/repository.mjs';

const owner = '22222222-2222-4222-8222-222222222222';
const other = '33333333-3333-4333-8333-333333333333';
const admin = { id: '11111111-1111-4111-8111-111111111111', app_metadata: { role: 'admin' } };
const request = body => new Request('https://example.com/admin-accounts', {
    method: 'POST', headers: { authorization: 'Bearer valid-token' }, body: JSON.stringify(body)
});

function handlerFixture(actor = admin) {
    const calls = [];
    return { calls, handler: createAdminAccountsHandler({
        authenticate: async () => actor,
        listPhotos: async options => { calls.push(['photos', options]); return { photos: [], total: 0, page: options.page, pageSize: 12 }; },
        getPhotoOriginal: async id => { calls.push(['original', id]); return { url: 'https://example.com/signed', expiresIn: 60 }; }
    }) };
}

test('recent photo listing accepts a bounded page with optional real KST day and owner', async () => {
    const f = handlerFixture();
    const response = await f.handler(request({ action: 'photos', page: 2, day: '2024-02-29', ownerId: owner }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(f.calls, [['photos', { page: 2, day: '2024-02-29', ownerId: owner }]]);
    assert.deepEqual(await response.json(), { photos: [], total: 0, page: 2, pageSize: 12 });
    assert.equal((await f.handler(request({ action: 'photos' }))).status, 200);
    assert.deepEqual(f.calls[1], ['photos', { page: 1 }]);
    for (const patch of [{ page: 0 }, { page: 10001 }, { page: 1.5 }, { page: '1' },
        { day: '2026-02-29' }, { day: '2026-04-31' }, { day: '2026-1-01' }, { day: '2026-01-01T00:00:00Z' },
        { day: null }, { ownerId: 'not-an-account' }, { ownerId: null }]) {
        assert.equal((await f.handler(request({ action: 'photos', ...patch }))).status, 400, JSON.stringify(patch));
    }
    assert.equal(f.calls.length, 2);
});

test('original inspection accepts text photo IDs without accepting arbitrary paths or empty IDs', async () => {
    const f = handlerFixture();
    const response = await f.handler(request({ action: 'photo-original', photoId: '1791620513423-0' }));
    assert.equal(response.status, 200);
    assert.deepEqual(f.calls, [['original', '1791620513423-0']]);
    assert.deepEqual(await response.json(), { url: 'https://example.com/signed', expiresIn: 60 });
    for (const photoId of ['', ' ', '../secret', `${owner}/original.jpg`, 'a'.repeat(201), null, 123, 'a\n']) {
        assert.equal((await f.handler(request({ action: 'photo-original', photoId }))).status, 400);
    }
    assert.equal(f.calls.length, 1);
});

test('photo listing and originals never run for missing, member, editable or banned admin claims', async () => {
    for (const actor of [null, { ...admin, app_metadata: {} }, { id: admin.id, user_metadata: { role: 'admin' } },
        { ...admin, banned_until: '2999-01-01T00:00:00Z' }]) {
        const f = handlerFixture(actor);
        for (const body of [{ action: 'photos' }, { action: 'photo-original', photoId: 'photo-1' }]) {
            assert.equal((await f.handler(request(body))).status, actor ? 403 : 401);
        }
        assert.deepEqual(f.calls, []);
    }
});

test('missing originals return a safe not-found response without storage diagnostics', async () => {
    const handler = createAdminAccountsHandler({ authenticate: async () => admin, getPhotoOriginal: async () => null });
    const response = await handler(request({ action: 'photo-original', photoId: 'photo-1' }));
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'not_found' });
    const failed = createAdminAccountsHandler({ authenticate: async () => admin, getPhotoOriginal: async () => { throw new Error('private storage key'); } });
    const failure = await failed(request({ action: 'photo-original', photoId: 'photo-1' }));
    assert.equal(failure.status, 503);
    assert.doesNotMatch(await failure.text(), /private storage key/);
});

function repositoryFixture({ photos = [], profiles = [], total = photos.length, original = null, signingError = null } = {}) {
    const queries = [], signed = [];
    const client = {
        from(table) {
            const calls = [], record = { table, calls };
            queries.push(record);
            const query = {
                select(...args) { calls.push(['select', ...args]); return this; },
                eq(...args) { calls.push(['eq', ...args]); return this; },
                in(...args) { calls.push(['in', ...args]); return this; },
                gte(...args) { calls.push(['gte', ...args]); return this; },
                lt(...args) { calls.push(['lt', ...args]); return this; },
                order(...args) { calls.push(['order', ...args]); return this; },
                range(...args) { calls.push(['range', ...args]); return this; },
                maybeSingle() { record.single = true; return this; },
                then(resolve) { return Promise.resolve({ data: table === 'profiles' ? profiles : record.single ? original : photos, count: total }).then(resolve); }
            };
            return query;
        },
        storage: { from(bucket) { return {
            async createSignedUrls(paths, seconds) {
                signed.push({ bucket, paths, seconds });
                return { data: paths.map(path => ({ path, signedUrl: `https://example.com/signed/${encodeURIComponent(path)}` })) };
            },
            async createSignedUrl(path, seconds) {
                signed.push({ bucket, paths: [path], seconds });
                return signingError ? { error: signingError } : { data: { signedUrl: 'https://example.com/signed-original' } };
            }
        }; } }
    };
    return { repository: createAdminAccountsRepository(client), queries, signed };
}

test('recent photos use bounded stable pagination, exact KST boundaries, safe profiles and derivative-only output', async () => {
    const rows = [
        { id: 'p1', owner_id: owner, title: '골목', visibility: 'private', created_at: '2026-10-30T15:00:00Z', thumbnail_path: `${owner}/thumbnails/p1.jpg`, storage_path: `${owner}/original.jpg`, lat: 37 },
        { id: 'p2', owner_id: other, title: '카페', visibility: 'public', created_at: '2026-10-30T16:00:00Z', thumbnail_path: `${owner}/thumbnails/foreign.jpg`, preview_path: `${other}/previews/p2.jpg` }
    ];
    const f = repositoryFixture({ photos: rows, profiles: [{ id: owner, nickname: '작성자' }], total: 40 });
    const result = await f.repository.listPhotos({ page: 3, day: '2026-10-31', ownerId: owner });
    assert.equal(result.page, 3);
    assert.equal(result.pageSize, 12);
    assert.equal(result.total, 40);
    assert.equal(result.photos[0].ownerNickname, '작성자');
    assert.equal(result.photos[1].ownerNickname, '이름 없음');
    assert.deepEqual(f.queries[0].calls, [
        ['select', 'id,title,visibility,created_at,owner_id,thumbnail_path,preview_path', { count: 'exact' }],
        ['eq', 'owner_id', owner],
        ['gte', 'created_at', '2026-10-30T15:00:00.000Z'],
        ['lt', 'created_at', '2026-10-31T15:00:00.000Z'],
        ['order', 'created_at', { ascending: false, nullsFirst: false }],
        ['order', 'id', { ascending: false }],
        ['range', 24, 35]
    ]);
    assert.deepEqual(f.queries[1].calls, [['select', 'id,nickname'], ['in', 'id', [owner, other]]]);
    assert.deepEqual(f.signed, [{ bucket: 'photos', paths: [`${owner}/thumbnails/p1.jpg`, `${other}/previews/p2.jpg`], seconds: 300 }]);
    assert.deepEqual(Object.keys(result.photos[0]).sort(), ['id', 'title', 'visibility', 'created_at', 'owner_id', 'ownerNickname', 'thumbnailUrl'].sort());
    assert.doesNotMatch(JSON.stringify(result), /original\.jpg|storage_path|thumbnail_path|preview_path|"lat"/);
});

test('an empty recent-photo page issues no profile reads or signed URLs', async () => {
    const f = repositoryFixture();
    assert.deepEqual(await f.repository.listPhotos({ page: 1 }), { photos: [], total: 0, page: 1, pageSize: 12 });
    assert.equal(f.queries.length, 1);
    assert.deepEqual(f.signed, []);
});

test('an explicitly requested original signs only the canonical owned object for sixty seconds', async () => {
    const f = repositoryFixture({ original: { id: 'p1', owner_id: owner, storage_path: `${owner}/original.jpg` } });
    assert.deepEqual(await f.repository.getPhotoOriginal('p1'), { url: 'https://example.com/signed-original', expiresIn: 60 });
    assert.deepEqual(f.signed, [{ bucket: 'photos', paths: [`${owner}/original.jpg`], seconds: 60 }]);
    assert.deepEqual(f.queries[0].calls, [['select', 'id,owner_id,storage_path'], ['eq', 'id', 'p1']]);
});

test('original signing rejects missing photos, foreign owners, derivatives, encoded traversal and invalid paths', async () => {
    const paths = ['', `${other}/original.jpg`, `${owner}/../original.jpg`, `${owner}/a/./file.jpg`, `${owner}//file.jpg`,
        `${owner}\\original.jpg`, `${owner}/%2e%2e/file.jpg`, `${owner}/thumbnails/thumb.jpg`, `${owner}/previews/preview.jpg`,
        `photos/${owner}/file.jpg`, `https://example.com/${owner}/file.jpg`, `${owner}/file.jpg\n`];
    const absent = repositoryFixture();
    assert.equal(await absent.repository.getPhotoOriginal('missing'), null);
    for (const storage_path of paths) {
        const f = repositoryFixture({ original: { id: 'p1', owner_id: owner, storage_path } });
        assert.equal(await f.repository.getPhotoOriginal('p1'), null, storage_path);
        assert.deepEqual(f.signed, []);
    }
    const failed = repositoryFixture({ original: { id: 'p1', owner_id: owner, storage_path: `${owner}/original.jpg` }, signingError: new Error('private key') });
    await assert.rejects(failed.repository.getPhotoOriginal('p1'), /private key/);
});
