import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('content report foreign keys have covering indexes', () => {
    const migration = readFileSync(
        'supabase/migrations/20260830123000_add_content_report_fk_indexes.sql',
        'utf8'
    );

    assert.match(migration, /create index if not exists content_reports_reported_user_id_idx[\s\S]*content_reports\s*\(reported_user_id\)/iu);
    assert.match(migration, /create index if not exists content_reports_photo_id_idx[\s\S]*content_reports\s*\(photo_id\)/iu);
});
