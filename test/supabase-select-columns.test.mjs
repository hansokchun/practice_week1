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
    assert.equal(columns.includes('uploaded_at'), false);
});

test('profile select columns avoid optional profile fields absent from the live schema', () => {
    const columns = getSelectColumns('PROFILE_SELECT_COLUMNS');

    assert.deepEqual(columns, ['id', 'nickname']);
});
