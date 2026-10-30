import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createAdminAccountsHandler } from '../supabase/functions/admin-accounts/handler.mjs';
import { createAdminAccountsRepository } from '../supabase/functions/admin-accounts/repository.mjs';

const admin = { id: '11111111-1111-4111-8111-111111111111', app_metadata: { role: 'admin' } };
const overview = {
    accounts: { total: 12, members: 10, new7d: 2, new30d: 4 },
    photos: { total: 25, public: 18, new7d: 3, new30d: 8, owners: 6 },
    daily: [{ date: '2026-10-31', registrations: 1, uploads: 2 }],
    dwell: { sample_count: 5, average_seconds: 60, total_seconds: 300, days: 30 }
};
const request = () => new Request('https://example.com/admin-accounts', {
    method: 'POST', headers: { authorization: 'Bearer valid-token' }, body: JSON.stringify({ action: 'overview' })
});

test('overview returns aggregate data without an account id and disables caching', async () => {
    let reads = 0;
    const handler = createAdminAccountsHandler({ authenticate: async () => admin, getOverview: async () => { reads += 1; return overview; } });
    const response = await handler(request());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), overview);
    assert.equal(reads, 1);
});

test('overview never reads statistics for missing, member, user-editable, or banned admin claims', async () => {
    for (const actor of [null, { ...admin, app_metadata: {} }, { id: admin.id, user_metadata: { role: 'admin' } },
        { ...admin, banned_until: '2999-01-01T00:00:00Z' }]) {
        let reads = 0;
        const handler = createAdminAccountsHandler({ authenticate: async () => actor, getOverview: async () => { reads += 1; return overview; } });
        assert.equal((await handler(request())).status, actor ? 403 : 401);
        assert.equal(reads, 0);
    }
});

test('overview authorization uses current Auth account metadata after verifying the token', async () => {
    const calls = [];
    const repository = createAdminAccountsRepository({
        auth: {
            getUser: async token => { calls.push(['verify', token]); return { data: { user: admin } }; },
            admin: { getUserById: async id => { calls.push(['current', id]); return { data: { user: { ...admin, app_metadata: {} } } }; } }
        },
        rpc: async () => { calls.push(['overview']); return { data: overview }; }
    });
    const response = await createAdminAccountsHandler(repository)(request());
    assert.equal(response.status, 403);
    assert.deepEqual(calls, [['verify', 'valid-token'], ['current', admin.id]]);
});

test('overview repository calls only the aggregate RPC with no caller filters', async () => {
    const calls = [];
    const repository = createAdminAccountsRepository({ rpc: async (...args) => { calls.push(args); return { data: overview, error: null }; } });
    assert.deepEqual(await repository.getOverview(), overview);
    assert.deepEqual(calls, [['admin_site_overview']]);
});

test('overview failures expose no database diagnostics', async () => {
    const repository = createAdminAccountsRepository({ rpc: async () => ({ error: new Error('private config key') }) });
    await assert.rejects(repository.getOverview(), /private config key/);
    const response = await createAdminAccountsHandler({ authenticate: async () => admin, getOverview: repository.getOverview })(request());
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'request_failed' });
});

const directory = new URL('../supabase/migrations/', import.meta.url);
const readMigration = () => {
    const path = readdirSync(directory).find(name => /_admin_site_overview\.sql$/.test(name));
    assert.ok(path, 'the aggregate/dwell migration must exist');
    return readFileSync(new URL(path, directory), 'utf8');
};

test('overview RPC remains service-only with its privileged implementation outside public', () => {
    const migration = readMigration();
    const wrapper = migration.match(/create or replace function public\.admin_site_overview\(\)[\s\S]*?\$\$;/i)?.[0];
    assert.ok(wrapper);
    assert.match(wrapper, /security invoker set search_path = ''/i);
    assert.doesNotMatch(wrapper, /security definer/i);
    assert.match(migration, /revoke all on function public\.admin_site_overview\(\) from public, anon, authenticated/i);
    assert.match(migration, /grant execute on function public\.admin_site_overview\(\) to service_role/i);
    assert.doesNotMatch(migration, /grant execute on function (?:public|private)\.admin_site_overview\(\) to (?:anon|authenticated)/i);
    assert.doesNotMatch(migration, /(?:email|encrypted_password|raw_user_meta_data|latitude|longitude|thumbnail_path|preview_path)/i);
});

test('dwell storage contains daily totals only, enables RLS, and revokes direct visitor access', () => {
    const migration = readMigration();
    for (const table of ['site_activity_daily', 'site_activity_config']) {
        assert.match(migration, new RegExp(`create table private\\.${table}`));
        assert.match(migration, new RegExp(`alter table private\\.${table} enable row level security`));
        assert.match(migration, new RegExp(`revoke all on private\\.${table} from public, anon, authenticated`));
    }
    assert.doesNotMatch(migration, /(?:visitor_id|visit_id|session_id|ip_address|user_agent|photo_id|account_id)/i);
    assert.match(migration, /ingest_key_hash text/);
    assert.doesNotMatch(migration, /ingest_key text\s+(?:not null|default)/i);
});

test('dwell RPC uses an invoker wrapper and secret validation before its first write', () => {
    const migration = readMigration();
    const wrapper = migration.match(/create or replace function public\.record_site_activity\(p_seconds integer, p_ingest_key text\)[\s\S]*?\$\$;/i)?.[0];
    assert.ok(wrapper);
    assert.match(wrapper, /security invoker set search_path = ''/i);
    const implementation = migration.match(/create or replace function private\.record_site_activity[\s\S]*?\$\$;/i)?.[0];
    assert.ok(implementation);
    assert.match(implementation, /security definer set search_path = ''/i);
    assert.match(implementation, /p_seconds is null or p_seconds < 1 or p_seconds > 3600/i);
    assert.match(implementation, /octet_length\(p_ingest_key\)/i);
    assert.match(implementation, /extensions\.digest\(p_ingest_key, 'sha256'\)/i);
    assert.ok(implementation.indexOf('stored_hash is null') < implementation.indexOf('insert into'));
    assert.match(implementation, /where private\.site_activity_daily\.samples < 10000/i);
    assert.match(implementation, /if accepted_samples = 1 then[\s\S]*delete from private\.site_activity_daily/i);
    assert.match(implementation, /day < today - 90/i);
    assert.match(migration, /grant execute on function public\.record_site_activity\(integer, text\) to anon, service_role/i);
});
