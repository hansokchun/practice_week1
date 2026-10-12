import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAdminAccountsRepository } from '../supabase/functions/admin-accounts/repository.mjs';
import { buildAccountNotificationItems } from '../js/account-notifications.mjs';
const migration = readFileSync('supabase/migrations/20261012131738_admin_account_management.sql', 'utf8');

test('the account directory is service-only and Auth security definers stay private', () => {
    assert.match(migration, /public\.admin_account_page[\s\S]*security invoker/);
    assert.match(migration, /revoke all on function public\.admin_account_page\(text,integer,text\) from public, anon, authenticated/);
    assert.match(migration, /grant execute on function public\.admin_account_page\(text,integer,text\) to service_role/);
    assert.match(migration, /private\.admin_account_page[\s\S]*security definer set search_path = ''/);
    const publicFunction = migration.match(/create or replace function public\.admin_account_page[\s\S]*?\$\$;/)?.[0];
    assert.ok(publicFunction);
    assert.doesNotMatch(publicFunction, /security definer/);
});
test('ban guards cover RLS, existing definer RPC writes, and storage while warning acknowledgements stay scoped', () => {
    assert.match(migration, /as restrictive for all to authenticated/);
    assert.match(migration, /before insert or update or delete/);
    assert.match(migration, /current_setting\('role',true\) = 'authenticated'/);
    assert.match(migration, /banned_until is null or banned_until <= now\(\)/);
    assert.match(migration, /grant select, update\(acknowledged_at\)/);
    assert.match(migration, /moderation_acknowledge_own_warning[\s\S]*target_user_id = \(select auth.uid\(\)\)/);
    assert.match(migration, /account_moderation_pending_idx[\s\S]*where state = 'pending'/);
});
test('service credentials appear only in the server entrypoint and account state clears on role loss', () => {
    const entry = readFileSync('supabase/functions/admin-accounts/index.ts', 'utf8');
    assert.match(entry, /Deno.env.get\('SUPABASE_SERVICE_ROLE_KEY'\)/);
    assert.doesNotMatch(readFileSync('auth.js', 'utf8'), /SUPABASE_SERVICE_ROLE_KEY|sb_secret_/);
    assert.match(readFileSync('js/app.js', 'utf8'), /if \(!isLandingAdmin\(state.currentUser\)\) \{\s*adminAccountsController.clear\(\)/);
});
test('warnings remain actionable even when optional account notifications are off', () => {
    const items = buildAccountNotificationItems({ currentUserId: 'a', missingLocationNotifications: false, librarySummaryNotifications: false, moderationWarnings: [{ id: 'warning1' }] });
    assert.equal(items[0].moderationId, 'warning1');
    assert.match(readFileSync('js/app.js', 'utf8'), /item.route \|\| item.id \|\| item.moderationId/);
});

function repoFixture({ existing = null, authFailure = false } = {}) {
    const calls = [];
    const client = {
        auth: { admin: { updateUserById: async (id, patch) => { calls.push(['auth', id, patch]); return authFailure ? { error: new Error('offline') } : { data: { user: { banned_until: '2030-01-01T00:00:00Z' } } }; } } },
        from() {
            let kind = 'select', value;
            const query = {
                select() { return this; }, eq() { return this; }, maybeSingle() { return this; },
                insert(row) { kind = 'insert'; value = row; return this; }, update(row) { kind = 'update'; value = row; return this; },
                then(resolve) { calls.push([kind, value]); return Promise.resolve({ data: kind === 'select' ? existing : null, error: null }).then(resolve); }
            };
            return query;
        }
    };
    return { repo: createAdminAccountsRepository(client), calls };
}
const operation = { actorId: 'admin', userId: 'user', operation: 'ban', reason: '반복된 스팸 등록', durationHours: 168, requestId: 'request' };
test('moderation records the pending audit before changing Auth and completes it afterwards', async () => {
    const { repo, calls } = repoFixture();
    await repo.moderateAccount(operation);
    assert.deepEqual(calls.map(call => call[0]), ['select', 'insert', 'auth', 'update']);
    assert.deepEqual(calls[2][2], { ban_duration: '168h' });
    assert.equal(calls[3][1].state, 'completed');
});
test('completed retries cannot repeat moderation or be reused for another account', async () => {
    const existing = { target_user_id: 'user', actor_id: 'admin', action: 'ban', reason: operation.reason, duration_hours: 168, state: 'completed' };
    const { repo, calls } = repoFixture({ existing });
    await repo.moderateAccount(operation);
    assert.equal(calls.length, 1);
    await assert.rejects(repo.moderateAccount({ ...operation, userId: 'other' }), error => error.code === 'moderation_busy');
});
test('warnings do not mutate Auth; failed bans retain a failure audit', async () => {
    const f = repoFixture();
    await f.repo.moderateAccount({ ...operation, operation: 'warning', durationHours: null });
    assert.ok(f.calls.every(call => call[0] !== 'auth'));
    const failed = repoFixture({ authFailure: true });
    await assert.rejects(failed.repo.moderateAccount(operation));
    assert.equal(failed.calls.at(-1)[1].state, 'failed');
});

test('private photo previews sign only owned derivatives for five minutes and omit Auth metadata', async () => {
    const id = 'owner';
    const photos = [{ id: 'a', thumbnail_path: 'owner/thumbnails/a.webp', visibility: 'private' },
        { id: 'b', thumbnail_path: 'other/thumbnails/b.webp' }, { id: 'c', preview_path: 'owner/previews/c.jpg' },
        { id: 'd', thumbnail_path: 'owner/original.jpg' }, { id: 'e', thumbnail_path: 'owner/thumbnails/../original.jpg' }];
    let signedPaths, expiry;
    const client = {
        auth: { admin: { getUserById: async () => ({ data: { user: { id, email: 'test@example.com', user_metadata: { secret: 'hidden' }, app_metadata: { role: 'member' } } } }) } },
        from(table) {
            let count = false;
            return { select(columns, options) { count = options?.head; return this; }, eq() { return this; }, order() { return this; }, limit() { return this; }, maybeSingle() { return this; },
                then(resolve) { return Promise.resolve({ data: table === 'profiles' ? { nickname: '회원' } : table === 'photos' && !count ? photos : [], count: 5 }).then(resolve); } };
        },
        storage: { from: () => ({ createSignedUrls: async (paths, seconds) => { signedPaths = paths; expiry = seconds; return { data: paths.map(path => ({ path, signedUrl: `https://example.com/${path}` })) }; } }) }
    };
    const data = await createAdminAccountsRepository(client).inspectAccount(id);
    assert.deepEqual(signedPaths, ['owner/thumbnails/a.webp', 'owner/previews/c.jpg']);
    assert.equal(expiry, 300);
    assert.equal(data.photos.filter(photo => photo.thumbnailUrl).length, 2);
    assert.doesNotMatch(JSON.stringify(data), /hidden|user_metadata|thumbnail_path|original\.jpg/);
});
