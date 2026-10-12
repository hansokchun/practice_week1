import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminAccountsController } from '../js/admin-accounts-controller.mjs';

function fixture(overrides = {}) {
    const nodes = new Map();
    globalThis.document = { getElementById(id) {
        if (!nodes.has(id)) nodes.set(id, { textContent: '', innerHTML: '', value: '', hidden: false, disabled: false,
            listeners: {}, classList: { contains: () => false },
            addEventListener(type, callback) { this.listeners[type] = callback; }, scrollIntoView() {} });
        return nodes.get(id);
    } };
    globalThis.window = { matchMedia: () => ({ matches: false }) };
    let user = { id: 'admin', app_metadata: { role: 'admin' } };
    const calls = [];
    const controller = createAdminAccountsController({ getUser: () => user,
        fetchAccounts: async () => ({ data: { accounts: [{ id: 'member', nickname: '회원', photo_count: 3 }], total: 1 } }),
        inspectAccount: async () => ({ data: { account: { id: 'member', nickname: '회원' }, photos: [], history: [] } }),
        moderateAccount: async value => { calls.push(value); return {}; },
        openModal: () => {}, closeModals: () => {}, showToast: text => calls.push(text), ...overrides });
    controller.bind();
    const click = (id, selector, dataset) => nodes.get(id).listeners.click({ target: { closest: value => value === selector ? { dataset } : null } });
    const settle = () => new Promise(resolve => setImmediate(resolve));
    return { controller, nodes, calls, setUser: value => { user = value; }, click, settle };
}
test('clearing the controller invalidates a pending account directory response', async () => {
    let resolve;
    const f = fixture({ fetchAccounts: () => new Promise(done => { resolve = done; }) });
    const loading = f.controller.load();
    f.controller.clear();
    resolve({ data: { accounts: [{ id: 'private', email: 'private@example.com' }], total: 1 } });
    await loading;
    assert.equal(f.nodes.get('admin-account-list').innerHTML.includes('private@example.com'), false);
    assert.equal(f.nodes.get('admin-account-list').textContent, '');
});
test('role loss prevents a delayed detail response from rendering', async () => {
    let resolve;
    const f = fixture({ inspectAccount: () => new Promise(done => { resolve = done; }) });
    await f.controller.load();
    f.click('admin-account-list', '[data-admin-account]', { adminAccount: 'member' });
    f.setUser({ id: 'admin', app_metadata: { role: 'member' } });
    f.controller.clear();
    resolve({ data: { account: { email: 'private@example.com' } } });
    await f.settle();
    assert.equal(f.nodes.get('admin-account-detail').hidden, true);
    assert.equal(f.nodes.get('admin-account-detail').innerHTML.includes('private@example.com'), false);
});
test('moderation submissions require a reason and suppress duplicate submits', async () => {
    let resolve;
    const f = fixture({ moderateAccount: value => { f.calls.push(value); return new Promise(done => { resolve = done; }); } });
    await f.controller.load();
    f.click('admin-account-list', '[data-admin-account]', { adminAccount: 'member' });
    await f.settle();
    f.click('admin-account-detail', '[data-admin-moderate]', { adminModerate: 'warning' });
    const submit = f.nodes.get('admin-moderation-form').listeners.submit;
    await submit({ preventDefault() {} });
    assert.equal(f.calls.length, 0);
    f.nodes.get('admin-moderation-reason').value = '반복된 스팸 게시물';
    const pending = submit({ preventDefault() {} });
    await submit({ preventDefault() {} });
    assert.equal(f.calls.length, 1);
    assert.match(f.calls[0].requestId, /^[0-9a-f-]{36}$/);
    f.controller.clear();
    resolve({}); await pending;
    assert.equal(f.calls.length, 1);
});
