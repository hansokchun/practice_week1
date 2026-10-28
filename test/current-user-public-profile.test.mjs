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
    const withoutDiagnostics = app.replace(/markNativeBoot\('(?:SESSION_READY|PROFILE_READY)'\);/g, '');
    const startup = withoutDiagnostics.slice(withoutDiagnostics.indexOf('onDocumentReady(document, async'));
    const sessionIndex = startup.indexOf('state.currentUser = await getCurrentUser()');
    const profileIndex = startup.indexOf('await ensureCurrentUserPublicProfile()');
    const uiIndex = startup.indexOf('updateAccountUI()');
    assert.ok(sessionIndex >= 0 && sessionIndex < profileIndex && profileIndex < uiIndex);
    assert.match(app, /state\.currentUser = user;\s+await ensureCurrentUserPublicProfile\(\);\s+updateAccountUI\(\);/);
});
