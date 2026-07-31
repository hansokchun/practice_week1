import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const app = readFileSync('js/app.js', 'utf8');

test('current user profile is loaded once and reused across login providers', () => {
    const fnStart = app.indexOf('async function ensureCurrentUserPublicProfile');
    const fnEnd = app.indexOf('function normalizeSavedPhoto', fnStart);
    const body = app.slice(fnStart, fnEnd);

    assert.match(body, /fetchProfilesByIds\(\[user\.id\]\)/);
    assert.match(body, /if \(!storedProfile\)/);
    assert.match(body, /getProviderAccountProfile\(user\)/);
    assert.match(body, /updateProfileInDB\(user\.id, providerProfile\)/);
    assert.match(body, /resolveAccountProfile\(user, storedProfile\)/);
    assert.match(body, /state\.publicProfiles = \{/);
});

test('app startup and email auth load the stored profile before account UI', () => {
    assert.match(app, /state\.currentUser = await getCurrentUser\(\);\s+await ensureCurrentUserPublicProfile\(\);\s+updateAccountUI\(\);/);
    assert.match(app, /state\.currentUser = user;\s+await ensureCurrentUserPublicProfile\(\);\s+updateAccountUI\(\);/);
});
