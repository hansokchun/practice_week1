import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync('supabase/migrations/20261007093900_harden_photo_write_boundaries.sql', 'utf8');

test('likes can only be changed through the atomic authenticated RPC', () => {
    assert.match(sql, /revoke insert, update, delete.*public\.user_likes/is);
    assert.match(sql, /current_user in \('anon', 'authenticated'\)/);
    assert.match(sql, /new\.liked := old\.liked/);
    assert.match(sql, /public\.user_blocks/);
});

test('server upload limits serialize writes and preserve existing photo edits', () => {
    assert.match(sql, /pg_advisory_xact_lock/);
    assert.match(sql, /photo_count >= 100/);
    assert.match(sql, /today_count >= 20/);
    assert.match(sql, /public_count >= 5/);
    assert.match(sql, /interval '7 days'/);
    assert.match(sql, /new\.created_at := now\(\)/);
});

test('privacy copy explains accuracy and the actual web signed URL lifetime', () => {
    const privacy = readFileSync('public/privacy/index.html', 'utf8');
    assert.match(privacy, /대략적인 위치.*정확도/);
    assert.match(privacy, /최대 15분/);
    assert.doesNotMatch(privacy, /기본값은 숨김/);
    assert.match(privacy, /웹에서는/);
});
