import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminAccountsHandler } from '../supabase/functions/admin-accounts/handler.mjs';

const admin = { id: '11111111-1111-4111-8111-111111111111', app_metadata: { role: 'admin' } };
const member = { id: '22222222-2222-4222-8222-222222222222', app_metadata: {} };
const requestId = '33333333-3333-4333-8333-333333333333';
const req = (body, token = 'valid-token') => new Request('https://example.com/admin-accounts', {
    method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body)
});
function fixture(actor = admin) {
    const calls = [];
    return { calls, handler: createAdminAccountsHandler({
        authenticate: async () => actor,
        listAccounts: async options => { calls.push(options); return { accounts: [member], total: 1 }; },
        getAccount: async () => member,
        inspectAccount: async id => ({ account: { id }, photos: [], history: [] }),
        moderateAccount: async operation => { calls.push(operation); return { completed: true }; }
    }) };
}
test('admin API rejects anonymous users and user-editable admin claims', async () => {
    assert.equal((await fixture().handler(req({ action: 'list' }, ''))).status, 401);
    for (const user of [null, member, { ...member, user_metadata: { role: 'admin' } }]) {
        assert.equal((await fixture(user).handler(req({ action: 'list' }))).status, user ? 403 : 401);
    }
});
test('admin listing bounds pages and validates filters', async () => {
    const { handler, calls } = fixture();
    assert.equal((await handler(req({ action: 'list', page: 2, search: '서울', status: 'banned' }))).status, 200);
    assert.deepEqual(calls[0], { page: 2, search: '서울', status: 'banned' });
    assert.equal((await handler(req({ action: 'list', page: -1 }))).status, 400);
    assert.equal((await handler(req({ action: 'list', status: 'admin' }))).status, 400);
});
test('account inspection requires a valid account id', async () => {
    assert.equal((await fixture().handler(req({ action: 'detail', userId: member.id }))).status, 200);
    assert.equal((await fixture().handler(req({ action: 'detail', userId: '../users' }))).status, 400);
});
test('moderation requires a reason, an idempotency key, and supported duration', async () => {
    const body = { action: 'moderate', userId: member.id, operation: 'ban', reason: '반복된 스팸 등록', durationHours: 168, requestId };
    const { handler, calls } = fixture();
    assert.equal((await handler(req(body))).status, 200);
    assert.equal(calls[0].actorId, admin.id);
    assert.equal(calls[0].userId, member.id);
    for (const patch of [{ reason: '' }, { requestId: '' }, { durationHours: 5 }, { operation: 'delete' }]) {
        assert.equal((await handler(req({ ...body, ...patch }))).status, 400);
    }
});
test('administrators cannot moderate themselves or other administrators', async () => {
    const body = { action: 'moderate', userId: admin.id, operation: 'warning', reason: '테스트 경고 사유', requestId };
    assert.equal((await fixture().handler(req(body))).status, 403);
    const f = fixture();
    const handler = createAdminAccountsHandler({ authenticate: async () => admin, getAccount: async () => ({ ...member, app_metadata: { role: 'admin' } }), moderateAccount: async () => f.calls.push('bad') });
    assert.equal((await handler(req({ ...body, userId: member.id }))).status, 403);
    assert.equal(f.calls.length, 0);
});
test('failures do not leak service errors or cache account data', async () => {
    const handler = createAdminAccountsHandler({ authenticate: async () => admin, listAccounts: async () => { throw new Error('secret'); } });
    const response = await handler(req({ action: 'list' }));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(await response.text(), /secret/);
});
