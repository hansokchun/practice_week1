import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

const auth = readFileSync('auth.js', 'utf8');

test('profile covers use a stable public URL and an owner-scoped storage path', () => {
    const start = auth.indexOf('export async function uploadProfileCover');
    const end = auth.indexOf('\nexport async function', start + 1);
    const body = auth.slice(start, end);

    assert.ok(start > -1);
    assert.match(body, /\.from\('avatars'\)/);
    assert.match(body, /`\$\{userId\}\/cover-\$\{crypto\.randomUUID\(\)\}/);
    assert.match(body, /\.getPublicUrl\(storagePath\)/);
    assert.doesNotMatch(body, /createSignedUrl/);
});

test('profile cover migration adds the field and owner-only upload policy', () => {
    const migrationName = readdirSync('supabase/migrations')
        .find((name) => name.endsWith('_add_profile_cover_image.sql'));

    assert.ok(migrationName, 'profile cover migration should exist');
    const migration = readFileSync(`supabase/migrations/${migrationName}`, 'utf8');
    assert.match(migration, /add column if not exists cover_path text not null default ''/);
    assert.match(migration, /storage\.filename\(name\) ~ '\^cover-/);
    assert.match(migration, /\(storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)::text\)/);
    assert.match(migration, /allowed_mime_types = array\['image\/jpeg', 'image\/png', 'image\/webp'\]/);
});
