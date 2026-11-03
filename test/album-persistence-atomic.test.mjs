import test from 'node:test';
import assert from 'node:assert/strict';
import { mutateAlbumPhotos } from '../js/album-persistence.mjs';

test('album replacement uses one atomic RPC including an empty selection', async () => {
    const calls = [];
    const sb = { rpc: async (...args) => { calls.push(args); return { data: [], error: null }; } };
    await mutateAlbumPhotos(sb, 'album', ['a', 'a', 'b'], 'replace');
    await mutateAlbumPhotos(sb, 'album', [], 'replace');
    assert.deepEqual(calls, [
        ['mutate_album_photos', { target_album_id: 'album', selected_photo_ids: ['a', 'b'], mutation_mode: 'replace' }],
        ['mutate_album_photos', { target_album_id: 'album', selected_photo_ids: [], mutation_mode: 'replace' }]
    ]);
});

test('RPC errors and rejected requests never report album success', async () => {
    const failure = { message: 'write failed' };
    for (const rpc of [async () => ({ error: failure }), async () => { throw failure; }]) {
        assert.deepEqual(await mutateAlbumPhotos({ rpc }, 'album', ['a'], 'append'), { data: [], error: failure });
    }
});

test('append does not clear existing photos and invalid requests never reach RPC', async () => {
    let calls = 0;
    const sb = { rpc: async () => { calls++; return { data: [], error: null }; } };
    assert.deepEqual(await mutateAlbumPhotos(sb, 'album', [], 'append'), { data: [], error: null });
    assert.ok((await mutateAlbumPhotos(sb, '', ['a'], 'replace')).error);
    assert.ok((await mutateAlbumPhotos(sb, 'album', ['a'], 'invalid')).error);
    assert.equal(calls, 0);
});
