import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { quotaState, renderQuotaUsage, createAdminQuotaController } from '../js/admin-quota.mjs';
import { validateQuotaSnapshot } from '../supabase/functions/admin-accounts/quota.mjs';
import { createAdminAccountsHandler } from '../supabase/functions/admin-accounts/handler.mjs';
import { createAdminAccountsRepository } from '../supabase/functions/admin-accounts/repository.mjs';

const now = Date.parse('2026-11-03T06:00:00Z');
const snapshot = { period_start: '2026-11-01', period_end: '2026-12-01', egress_gb: 4, cached_egress_gb: 0, mau: null, function_calls: 450000 };
test('quota boundaries distinguish warning, critical, reached, exceeded and unknown', () => {
    for (const [used, state] of [[0,'normal'], [79.99,'normal'], [80,'warning'], [90,'critical'], [100,'reached'], [101,'exceeded'], [null,'unknown'], [undefined,'unknown'], [NaN,'unknown'], [-1,'unknown'], ['','unknown']]) {
        assert.equal(quotaState(used, 100), state);
    }
});
test('quota rendering never invents zero and shows capacity scope and unknown monthly usage', () => {
    const html = renderQuotaUsage({ measured_at: new Date(now).toISOString(), database_bytes: 15576211, storage_bytes: 347228143 }, now);
    assert.match(html, /34.7%/);
    assert.match(html, /확인 필요/);
    assert.match(html, /프로젝트/);
    assert.match(html, /조직/);
    assert.doesNotMatch(html, /NaN|undefined|전체 정상/);
    assert.doesNotMatch(renderQuotaUsage({}, now), /<meter/);
});
test('manual monthly values are labeled, stale never presented current, expired never gets a meter', () => {
    const data = { snapshot: { ...snapshot, observed_at: new Date(now).toISOString() } };
    assert.match(renderQuotaUsage(data, now), /80%/);
    assert.match(renderQuotaUsage(data, now), /수동 확인/);
    assert.match(renderQuotaUsage(data, now + 25 * 3600000), /24시간/);
    const expired = renderQuotaUsage(data, Date.parse('2026-12-01T00:00:00Z'));
    assert.match(expired, /기간 만료/);
    assert.doesNotMatch(expired, /<meter/);
    assert.doesNotMatch(renderQuotaUsage({ snapshot: { ...data.snapshot, observed_at: '<img onerror=bad>' } }, now), /<img|<meter/);
});
test('snapshot validation rejects impossible periods, future/outdated cycle and unsafe numbers, keeps null distinct from zero', () => {
    assert.deepEqual(validateQuotaSnapshot(snapshot, now), snapshot);
    for (const patch of [{ period_start: '2026-02-30' }, { period_end: '2026-11-01' }, { period_start: '2026-10-01' }, { period_start: '2026-11-04' }, { egress_gb: -1 }, { egress_gb: '4' }, { mau: 0.5 }, { function_calls: Infinity }, { egress_gb: null, cached_egress_gb: null, mau: null, function_calls: null }]) {
        assert.equal(validateQuotaSnapshot({ ...snapshot, ...patch }, now), null);
    }
});
const admin = { id: '11111111-1111-4111-8111-111111111111', app_metadata: { role: 'admin' } };
const request = body => new Request('https://example.com', { method: 'POST', headers: { authorization: 'Bearer test-token' }, body: JSON.stringify(body) });
test('quota actions require current admin and never accept caller actor IDs', async () => {
    for (const actor of [null, { id: admin.id, user_metadata: { role: 'admin' } }, { ...admin, banned_until: '2999-01-01' }]) {
        let calls = 0;
        const handler = createAdminAccountsHandler({ authenticate: async () => actor, getQuotaUsage: async () => calls++, saveQuotaSnapshot: async () => calls++ });
        for (const action of ['quota', 'quota-save']) assert.equal((await handler(request({ action, snapshot }))).status, actor ? 403 : 401);
        assert.equal(calls, 0);
    }
    let saved;
    const date = new Date();
    const current = { ...snapshot, period_start: date.toISOString().slice(0,10), period_end: new Date(date.getTime() + 86400000).toISOString().slice(0,10) };
    const handler = createAdminAccountsHandler({ authenticate: async () => admin, getQuotaUsage: async () => ({ database_bytes: 1 }), saveQuotaSnapshot: async (...args) => { saved = args; return { saved: true }; } });
    assert.equal((await handler(request({ action: 'quota' }))).status, 200);
    const response = await handler(request({ action: 'quota-save', snapshot: current, actorId: 'forged' }));
    assert.equal(response.status, 200);
    assert.deepEqual(saved, [current, admin.id]);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await handler(request({ action: 'quota-save', snapshot: {} }))).status, 400);
});
test('repository uses aggregate service-only RPCs and sanitizes errors at handler boundary', async () => {
    const calls = [];
    const repository = createAdminAccountsRepository({ rpc: async (...args) => { calls.push(args); return { data: { ok: true } }; } });
    await repository.getQuotaUsage(); await repository.saveQuotaSnapshot(snapshot, admin.id);
    assert.deepEqual(calls, [['admin_quota_usage'], ['admin_quota_snapshot_save', { p_snapshot: snapshot, p_actor_id: admin.id }]]);
    const handler = createAdminAccountsHandler({ authenticate: async () => admin, getQuotaUsage: async () => { throw new Error('private-secret'); } });
    const response = await handler(request({ action: 'quota' }));
    assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /private-secret/);
});
test('quota migration uses invoker functions, RLS and no visitor grants', () => {
    const dir = new URL('../supabase/migrations/', import.meta.url);
    const migration = readFileSync(new URL(readdirSync(dir).find(name => name.endsWith('_admin_free_quota_monitor.sql')), dir), 'utf8');
    assert.doesNotMatch(migration, /security definer/i);
    assert.match(migration, /alter table private\.quota_billing_snapshot enable row level security/i);
    for (const name of ['admin_quota_usage', 'admin_quota_snapshot_save']) {
        assert.match(migration, new RegExp(`revoke all on function public\\.${name}[^;]+from public, anon, authenticated`, 'i'));
        assert.match(migration, new RegExp(`grant execute on function public\\.${name}[^;]+to service_role`, 'i'));
    }
    assert.match(migration, /pg_database_size/);
    assert.match(migration, /storage\.objects/);
});
test('controller ignores late responses after logout and shows failure without fake measurements', async () => {
    let user = admin, resolve;
    const nodes = Object.fromEntries(['content', 'status', 'form', 'save'].map(key => [key, { innerHTML:'', textContent:'', disabled:false, reset(){}, setAttribute(){}, removeAttribute(){} }]));
    const root = { querySelector: selector => nodes[selector.replace('[data-quota-', '').replace(']', '')] };
    const controller = createAdminQuotaController({ getUser: () => user, root: () => root, fetchUsage: () => new Promise(done => { resolve = done; }) });
    const pending = controller.load(); user = null; controller.clear(); resolve({ data: { database_bytes: 5 } }); await pending;
    assert.equal(nodes.content.innerHTML, '');
    user = admin;
    const failing = createAdminQuotaController({ getUser: () => user, root: () => root, fetchUsage: async () => ({ error: new Error('offline') }) });
    await failing.load(); assert.match(nodes.status.textContent, /조회 실패/);
    assert.doesNotMatch(nodes.content.innerHTML, /<meter/);
});

test('quota refresh does not overwrite an unsaved manual input and rejects stale concurrent reads', async () => {
    const handlers = {}, input = {value:''}; let call = 0, resolve;
    const form = { elements: {namedItem: name => name === 'egress_gb' ? input : null}, reset(){input.value='';}, addEventListener: (name, handler)=>{handlers[name]=handler;} };
    const nodes = { form, content:{innerHTML:'',setAttribute(){},removeAttribute(){}}, status:{textContent:''}, save:{disabled:false}, refresh:{addEventListener(){}} };
    const controller = createAdminQuotaController({getUser:()=>admin, root:()=>({querySelector:selector=>nodes[selector.replace('[data-quota-','').replace(']','')]}), fetchUsage:()=>++call === 2 ? new Promise(done=>{resolve=done;}) : Promise.resolve({data:{snapshot:{egress_gb:call}}})});
    controller.bind(); await controller.load(); assert.equal(input.value,1);
    input.value='4.2'; handlers.input();
    const pending=controller.load(); await controller.load();
    assert.equal(input.value,'4.2');
    const settled=nodes.content.innerHTML; resolve({data:{snapshot:{egress_gb:999}}}); await pending;
    assert.equal(nodes.content.innerHTML,settled);
    controller.clear(); assert.equal(input.value,'');
});

test('quota panel is attached to admin route lifecycle with explicit scope, limits and manual form', () => {
    const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
    const app=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
    assert.match(html,/id="admin-quota"/);
    assert.match(html,/요금제는 자동으로 감지하지 않습니다/);
    for(const field of ['period_start','period_end','egress_gb','cached_egress_gb','mau','function_calls']) assert.match(html,new RegExp(`name="${field}"`));
    assert.match(app,/normalized === 'admin-accounts'[^\n]*adminQuotaController\.load\(\)/);
    assert.ok((app.match(/adminQuotaController\.clear\(\)/g)||[]).length >= 3);
    assert.match(app,/adminQuotaController\.bind\(\)/);
});
