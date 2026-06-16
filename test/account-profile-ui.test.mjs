import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('style.css', 'utf8');
const app = readFileSync('js/app.js', 'utf8');
const auth = readFileSync('auth.js', 'utf8');

test('logged-in header exposes a profile trigger with avatar and account name', () => {
    assert.match(html, /id="btn-open-profile"/);
    assert.match(html, /id="account-avatar"/);
    assert.match(html, /id="account-avatar-image"/);
    assert.match(html, /id="account-avatar-fallback"/);
    assert.match(html, /id="account-label"/);
    assert.match(html, /id="account-guest-label"/);
    assert.match(css, /\.account-profile-trigger\s*\{/);
    assert.match(css, /body\.is-logged-out\s+#btn-open-profile\s*\{[^}]*display:\s*none;/s);
    assert.match(css, /body\.is-logged-in\s+#account-guest-label\s*\{[^}]*display:\s*none;/s);
});

test('personal profile modal includes Instagram-like summary and edit fields', () => {
    assert.match(html, /id="account-profile-modal"/);
    assert.match(html, /id="account-profile-title"/);
    assert.match(html, /id="account-profile-edit"/);
    assert.match(html, /id="account-profile-form" class="account-profile-form" hidden/);
    assert.match(html, /id="profile-display-name-input"/);
    assert.match(html, /id="profile-username-input"/);
    assert.match(html, /id="profile-bio-input"/);
    assert.match(html, /id="profile-website-input"/);
    assert.match(html, /id="profile-avatar-url-input"/);
    assert.match(html, /id="account-profile-save"/);
    assert.match(css, /\.account-profile-modal-card\s*\{/);
    assert.match(css, /\.account-profile-metrics\s*\{/);
});

test('profile updates use Supabase auth metadata and keep public nickname in sync', () => {
    assert.match(auth, /export async function updateUserMetadata\(metadata\)/);
    assert.match(app, /updateUserMetadata,/);
    assert.match(app, /async function saveAccountProfile\(event\)/);
    assert.match(app, /await updateUserMetadata\(\{\s*nickname,\s*username,\s*bio,\s*website,\s*avatar_url: avatarUrl\s*\}\)/s);
    assert.match(app, /await updateNicknameInDB\(state\.currentUser\.id,\s*nickname\)/);
    assert.match(app, /state\.profileNames = \{ \.\.\.state\.profileNames, \[state\.currentUser\.id\]: nickname \};/);
});

test('header profile trigger opens the personal profile modal and supports edit mode', () => {
    assert.match(app, /function openAccountProfileModal\(\)/);
    assert.match(app, /function setAccountProfileEditMode\(isEditing\)/);
    assert.match(app, /\$\('#btn-open-profile'\)\?\.addEventListener\('click', openAccountProfileModal\)/);
    assert.match(app, /\$\('#account-profile-edit'\)\?\.addEventListener\('click', \(\) => setAccountProfileEditMode\(true\)\)/);
    assert.match(app, /\$\('#account-profile-form'\)\?\.addEventListener\('submit', saveAccountProfile\)/);
});
