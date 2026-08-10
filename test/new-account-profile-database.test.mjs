import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('new social accounts start with the Ikkyee default profile until import is accepted', () => {
    const migration = readFileSync(
        'supabase/migrations/20260810093058_align_new_account_profile_defaults.sql',
        'utf8'
    );

    assert.match(migration, /CREATE OR REPLACE FUNCTION public\.handle_new_user\(\)/i);
    assert.match(migration, /nullif\(split_part\(coalesce\(new\.email, ''\), '@', 1\), ''\)/i);
    assert.match(migration, /'Guest'/);
    assert.match(migration, /''\s*,\s*''\s*\)\s*ON CONFLICT \(id\) DO NOTHING/is);
    assert.doesNotMatch(migration, /raw_user_meta_data\s*->>\s*'(avatar_url|picture|full_name|name|nickname)'/i);
});
