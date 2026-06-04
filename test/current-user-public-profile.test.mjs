import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const app = readFileSync('js/app.js', 'utf8');

test('current user profile is upserted from login metadata for public author display', () => {
    const fnStart = app.indexOf('async function ensureCurrentUserPublicProfile');
    const fnEnd = app.indexOf('function normalizeSavedPhoto', fnStart);
    const body = app.slice(fnStart, fnEnd);

    assert.match(body, /fetchProfilesByIds\(\[user\.id\]\)/);
    assert.match(body, /const existingName = getProfileDisplayName\(profile\)/);
    assert.match(body, /if \(existingName\)/);
    assert.match(body, /updateNicknameInDB\(user\.id, nickname\)/);
    assert.match(body, /state\.profileNames = \{ \.\.\.state\.profileNames, \[user\.id\]: nickname \}/);
});

test('app startup and email auth refresh the public profile row', () => {
    assert.match(app, /state\.currentUser = await getCurrentUser\(\);\s+updateAccountUI\(\);\s+await ensureCurrentUserPublicProfile\(\);/);
    assert.match(app, /state\.currentUser = user;\s+updateAccountUI\(\);\s+await ensureCurrentUserPublicProfile\(\);/);
});
