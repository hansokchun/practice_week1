import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const migrationName = readdirSync('supabase/migrations')
    .find((name) => name.endsWith('_optimize_landing_rls.sql'));

test('landing curation policies cache auth claims and index photo lookups', () => {
    assert.ok(migrationName, 'the landing RLS optimization migration must exist');
    const migration = readFileSync(`supabase/migrations/${migrationName}`, 'utf8');

    assert.match(
        migration,
        /create index if not exists landing_section_photos_photo_id_idx[\s\S]*on public\.landing_section_photos \(photo_id\)/i
    );
    assert.equal((migration.match(/\(select auth\.jwt\(\)\)/gi) || []).length, 10);
    assert.doesNotMatch(migration, /coalesce\(auth\.jwt\(\)/i);

    for (const policy of [
        'visible landing sections are public',
        'admins insert landing sections',
        'admins update landing sections',
        'admins delete landing sections',
        'public assignments only expose public photos',
        'admins insert landing assignments',
        'admins update landing assignments',
        'admins delete landing assignments'
    ]) {
        assert.match(migration, new RegExp(`drop policy if exists "${policy}"`, 'i'));
        assert.match(migration, new RegExp(`create policy "${policy}"`, 'i'));
    }
});
