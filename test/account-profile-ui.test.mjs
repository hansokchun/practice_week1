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

test('public profile page includes shared nickname, bio, and avatar editing fields for the current user', () => {
    assert.match(html, /id="page-profile"/);
    assert.match(app, /function ensureProfileHeaderShell\(\)/);
    assert.match(app, /id="profile-title"/);
    assert.match(app, /id="account-profile-edit"/);
    assert.match(app, /id="account-profile-form" class="account-profile-form profile-edit-form" hidden/);
    assert.match(app, /id="profile-bio"/);
    assert.match(app, /id="profile-avatar-image"/);
    assert.match(app, /id="profile-avatar-fallback"/);
    assert.match(app, /id="profile-photo-count"/);
    assert.match(app, /id="profile-album-count"/);
    assert.match(app, /id="profile-public-count"/);
    assert.match(app, /id="profile-nickname-input"/);
    assert.match(app, /id="profile-bio-input"/);
    assert.match(app, /id="profile-avatar-input"/);
    assert.match(app, /type="file"/);
    assert.match(app, /accept="image\/\*"/);
    assert.match(app, /id="account-profile-save"/);
    assert.match(css, /\.profile-owner-actions\s*\{/);
    assert.match(css, /\.account-profile-metrics\s*\{/);
    assert.match(app, /class="account-profile-fields"/);
    assert.match(app, /class="account-profile-field"/);
    assert.match(css, /\.account-profile-fields\s*\{/);
    assert.match(css, /\.account-profile-field\s*\{/);
    assert.match(css, /\.account-profile-field input,\s*\.account-profile-field textarea\s*\{/s);
    assert.match(css, /\.account-profile-upload\s*\{/);
    assert.doesNotMatch(app, /profile-display-name-input/);
    assert.doesNotMatch(app, /profile-username-input/);
    assert.doesNotMatch(app, /profile-website-input/);
    assert.doesNotMatch(app, /profile-avatar-url-input/);
});

test('profile updates use nickname, bio, and uploaded avatar metadata only', () => {
    assert.match(auth, /export async function updateUserMetadata\(metadata\)/);
    assert.match(auth, /export async function uploadImage\(file, fileName\)/);
    assert.match(app, /updateUserMetadata,/);
    assert.match(app, /uploadImage,/);
    assert.match(app, /async function saveAccountProfile\(event\)/);
    assert.match(app, /const avatarFile = .*#profile-avatar-input/s);
    assert.match(app, /await uploadImage\(avatarFile,\s*fileName\)/);
    assert.match(app, /await updateUserMetadata\(\{\s*nickname,\s*bio,\s*avatar_url: avatarUrl\s*\}\)/s);
    assert.match(app, /await updateNicknameInDB\(state\.currentUser\.id,\s*nickname\)/);
    assert.match(app, /state\.profileNames = \{ \.\.\.state\.profileNames, \[state\.currentUser\.id\]: nickname \};/);
    assert.doesNotMatch(app, /profile-website-input/);
    assert.doesNotMatch(app, /profile-username-input/);
    assert.doesNotMatch(app, /profile-avatar-url-input/);
});

test('header profile trigger routes to the shared public profile page and supports edit mode', () => {
    assert.match(app, /function openAccountProfilePage\(\)/);
    assert.match(app, /function setAccountProfileEditMode\(isEditing\)/);
    assert.match(app, /function handleAccountProfileAvatarChange\(event\)/);
    assert.match(app, /\$\('#btn-open-profile'\)\?\.addEventListener\('click', openAccountProfilePage\)/);
    assert.match(app, /\$\('#account-profile-edit'\)\?\.addEventListener\('click', \(\) => setAccountProfileEditMode\(true\)\)/);
    assert.match(app, /\$\('#account-profile-form'\)\?\.addEventListener\('submit', saveAccountProfile\)/);
    assert.match(app, /\$\('#profile-avatar-input'\)\?\.addEventListener\('change', handleAccountProfileAvatarChange\)/);
});
