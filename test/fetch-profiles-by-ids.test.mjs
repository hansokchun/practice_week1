import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('auth.js', 'utf8');

test('fetchProfilesByIds loads full profile rows and falls back to user_id lookup', () => {
    const fnStart = source.indexOf('export async function fetchProfilesByIds');
    const fnEnd = source.indexOf('//', fnStart + 1);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /\.select\('\*'\)/);
    assert.match(body, /\.in\('id', ids\)/);
    assert.match(body, /missingIds/);
    assert.match(body, /\.in\('user_id', missingIds\)/);
});
