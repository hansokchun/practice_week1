import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('style.css', 'utf8');
const app = readFileSync('js/app.js', 'utf8');
const auth = readFileSync('auth.js', 'utf8');

test('logged-in header exposes an image-only profile trigger', () => {
    assert.match(html, /id="btn-open-profile"/);
    assert.match(html, /id="account-avatar"/);
    assert.match(html, /id="account-avatar-image"/);
    assert.match(html, /id="account-avatar-fallback"/);
    assert.doesNotMatch(html, /id="account-label"/);
    assert.doesNotMatch(html, /id="account-guest-label"/);
    assert.match(css, /\.account-profile-trigger\s*\{/);
    assert.match(css, /\.account-profile-trigger\s*\{[^}]*width:\s*38px;[^}]*height:\s*38px;[^}]*border:\s*0;[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/s);
    assert.match(css, /\.account-avatar\s*\{[^}]*border:\s*1px solid rgba\(26,\s*77,\s*78,\s*0\.16\);[^}]*border-radius:\s*999px;[^}]*background:\s*var\(--surface\);/s);
    assert.doesNotMatch(css, /\.account-label\s*\{/);
    assert.doesNotMatch(css, /\.account-profile-name\s*\{/);
    assert.match(css, /\.account-profile-trigger:hover\s*\{[^}]*transform:\s*translateY\(-1px\);/s);
    assert.match(css, /body\.is-logged-out\s+#btn-open-profile\s*\{[^}]*display:\s*none;/s);
    assert.match(css, /body\.is-logged-in\s+#btn-open-auth\s*\{[^}]*display:\s*none;/s);
    assert.doesNotMatch(app, /const label = \$\('#account-label'\)/);
    assert.doesNotMatch(app, /account-guest-label/);
    assert.doesNotMatch(app, /label\.textContent = profile\.nickname/);
    assert.match(app, /if \(button\) \{\s*button\.hidden = Boolean\(state\.currentUser\);\s*button\.textContent = 'Login';\s*\}/s);
    assert.doesNotMatch(app, /button\.textContent = state\.currentUser \? 'Logout' : 'Login'/);
});

test('logged-in header exposes compact recommended notifications beside profile', () => {
    const notificationIndex = html.indexOf('id="btn-open-notifications"');
    const profileIndex = html.indexOf('id="btn-open-profile"');

    assert.ok(notificationIndex > -1);
    assert.ok(profileIndex > notificationIndex);
    assert.match(html, /id="account-notification-popover"/);
    assert.match(html, /id="account-notification-list"/);
    assert.match(css, /\.account-notification-trigger\s*\{[^}]*width:\s*38px;[^}]*height:\s*38px;[^}]*border-radius:\s*999px;/s);
    assert.match(css, /\.account-notification-popover\s*\{[^}]*position:\s*absolute;[^}]*right:\s*0;/s);
    assert.match(css, /body\.is-logged-out\s+#btn-open-notifications\s*\{[^}]*display:\s*none;/s);
    assert.match(app, /isNotificationPopoverOpen:\s*false/);
    assert.match(app, /function getAccountNotificationItems\(\)/);
    assert.match(app, /getMissingLocationPhotos\(state\.savedPhotos\)/);
    assert.match(app, /getLikedPhotos\(\)/);
    assert.match(app, /data-route="\$\{escapeHtml\(item\.route\)\}"/);
    assert.match(app, /\$\('#btn-open-notifications'\)\?\.addEventListener\('click', toggleAccountNotifications\)/);
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
    assert.doesNotMatch(app, /id="profile-bio-input"/);
    assert.match(app, /id="profile-avatar-input"/);
    assert.match(app, /type="file"/);
    assert.match(app, /accept="image\/\*"/);
    assert.match(app, /id="account-profile-save"/);
    assert.match(app, /id="account-profile-logout"/);
    assert.match(css, /\.profile-owner-actions\s*\{/);
    assert.match(css, /\.account-profile-metrics\s*\{/);
    assert.match(app, /class="account-profile-fields"/);
    assert.match(app, /class="account-profile-field profile-edit-name-field"/);
    assert.match(css, /\.account-profile-fields\s*\{/);
    assert.match(css, /\.account-profile-field\s*\{/);
    assert.match(css, /\.account-profile-field input,\s*\.account-profile-field textarea\s*\{/s);
    assert.match(css, /\.account-profile-upload\s*\{/);
    assert.match(app, /class="profile-title-row"/);
    assert.doesNotMatch(app, /profile-edit-avatar/);
    assert.match(app, /class="profile-avatar-file-input"/);
    assert.match(css, /\.profile-edit-name-field\s*\{/);
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
    assert.match(app, /const bio = bioInput\s*\?\s*String\(bioInput\.value \|\| ''\)\.trim\(\)\s*:\s*getCurrentAccountProfile\(\)\.bio;/s);
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
    assert.match(app, /async function handleLogout\(\)/);
    assert.match(app, /const accountProfileLogout = event\.target\.closest\('#account-profile-logout'\)/);
    assert.match(app, /if \(accountProfileLogout\) \{\s*await handleLogout\(\);\s*return;\s*\}/s);
    assert.match(app, /\$\('#account-profile-edit'\)\?\.addEventListener\('click', \(\) => setAccountProfileEditMode\(true\)\)/);
    assert.match(app, /\$\('#account-profile-form'\)\?\.addEventListener\('submit', saveAccountProfile\)/);
    assert.match(app, /\$\('#profile-avatar-input'\)\?\.addEventListener\('change', handleAccountProfileAvatarChange\)/);
});
