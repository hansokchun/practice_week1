import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('auth.js', 'utf8');

function getSelectColumns(constantName) {
    const match = source.match(new RegExp(`const ${constantName} = '([^']+)'`));
    assert.ok(match, `${constantName} should be declared`);
    return match[1].split(',');
}

test('photo select columns match the live photos schema used by saved photo surfaces', () => {
    const columns = getSelectColumns('PHOTO_SELECT_COLUMNS');

    assert.ok(columns.includes('title'));
    assert.ok(columns.includes('storage_path'));
    assert.ok(columns.includes('location_assignment_skipped'));
    assert.equal(columns.includes('uploaded_at'), false);
});

test('profile select columns include the canonical shared profile fields', () => {
    const columns = getSelectColumns('PROFILE_SELECT_COLUMNS');

    assert.deepEqual(columns, ['id', 'nickname', 'bio', 'avatar_url', 'cover_path']);
});
