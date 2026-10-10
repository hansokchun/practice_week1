import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const auth = readFileSync(new URL('../auth.js', import.meta.url), 'utf8');
const start = auth.indexOf('export async function deletePhoto(');
const rest = auth.slice(start);
const code = rest.slice(0, rest.indexOf('\n}') + 2).replace('export ', '');

function deletionHarness({ error = null, found = true } = {}) {
    const calls = [];
    const query = {
        delete() { calls.push('delete'); return this; },
        eq(key, id) { calls.push(['eq', key, id]); return this; },
        select() { return this; },
        async maybeSingle() { return { data: found ? { id: 'mine' } : null, error }; },
        then(resolve) { return Promise.resolve({ error }).then(resolve); }
    };
    const context = vm.createContext({
        getSupabase: () => ({ from: () => query, storage: { from: () => ({ remove: async paths => { calls.push(['storage', paths]); return { error: null }; } }) } }),
        getPhotoStoragePath: () => null
    });
    vm.runInContext(code, context);
    return { context, calls };
}

test('rejected database deletion preserves original and thumbnail storage objects', async () => {
    const h = deletionHarness({ error: new Error('RLS denied deletion') });
    const result = await h.context.deletePhoto('mine', '', 'owner/original.jpg', 'owner/thumb.jpg', 'owner/preview.jpg');
    assert.match(result.error.message, /RLS denied/);
    assert.equal(h.calls.some(c => Array.isArray(c) && c[0] === 'storage'), false);
});

test('zero deleted rows is not a success and does not erase files', async () => {
    const h = deletionHarness({ found: false });
    const result = await h.context.deletePhoto('mine', '', 'owner/original.jpg');
    assert.ok(result.error);
    assert.equal(h.calls.some(c => Array.isArray(c) && c[0] === 'storage'), false);
});

test('successful deletion removes each supplied variant only after deleting the row', async () => {
    const h = deletionHarness();
    const result = await h.context.deletePhoto('mine', '', 'owner/original.jpg', 'owner/thumb.jpg', 'owner/preview.jpg');
    assert.equal(result.error, null);
    assert.equal(h.calls[0], 'delete');
    const storage = h.calls.find(c => Array.isArray(c) && c[0] === 'storage');
    assert.ok(storage);
    assert.ok(storage[1].includes('owner/original.jpg'));
    assert.ok(storage[1].includes('owner/thumb.jpg'));
    assert.ok(storage[1].includes('owner/preview.jpg'));
});
