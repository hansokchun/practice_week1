import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('auth.js', 'utf8');

test('fetchProfilesByIds loads live profile display columns by profile id', () => {
    const fnStart = source.indexOf('export async function fetchProfilesByIds');
    const fnEnd = source.indexOf('//', fnStart + 1);
    const body = source.slice(fnStart, fnEnd);

    assert.match(source, /const PROFILE_SELECT_COLUMNS = 'id,nickname,bio,avatar_url,cover_path'/);
    assert.match(body, /\.select\(PROFILE_SELECT_COLUMNS\)/);
    assert.match(body, /hydrateProfileAssetUrls\(sb, data \|\| \[\]\)/);
    assert.doesNotMatch(body, /\.select\('\*'\)/);
    assert.match(body, /\.in\('id', ids\)/);
    assert.doesNotMatch(body, /\.in\('user_id'/);
});
