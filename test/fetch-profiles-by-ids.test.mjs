import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('auth.js', 'utf8');

test('fetchProfilesByIds loads display profile columns and falls back to user_id lookup', () => {
    const fnStart = source.indexOf('export async function fetchProfilesByIds');
    const fnEnd = source.indexOf('//', fnStart + 1);
    const body = source.slice(fnStart, fnEnd);

    assert.match(source, /const PROFILE_SELECT_COLUMNS = 'id,user_id,nickname,display_name,bio,avatar_url'/);
    assert.match(body, /\.select\(PROFILE_SELECT_COLUMNS\)/);
    assert.doesNotMatch(body, /\.select\('\*'\)/);
    assert.match(body, /\.in\('id', ids\)/);
    assert.match(body, /missingIds/);
    assert.match(body, /\.in\('user_id', missingIds\)/);
});
