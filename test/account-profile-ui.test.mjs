import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('style.css', 'utf8');
const app = readFileSync('js/app.js', 'utf8');
const auth = readFileSync('auth.js', 'utf8');

test('brand logo routes to the landing home page', () => {
    assert.match(html, /<a class="brand" href="#\/landing" data-route="landing" aria-label="Ikkyee landing">/);
    assert.match(app, /const LANDING_ROUTE = 'landing';/);
    assert.match(app, /ROUTES = new Set\(\[LANDING_ROUTE,/);
    assert.match(app, /normalized === LANDING_ROUTE \? '#\/landing'/);
    assert.match(app, /\$\$\(\'\[data-route\]\'\)\.forEach\(\(link\) => \{/);
    assert.match(app, /routeTo\(link\.dataset\.route\)/);
});

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
    assert.match(css, /\.account-notification-trigger\s*\{[^}]*width:\s*36px;[^}]*height:\s*40px;[^}]*border:\s*0;[^}]*border-radius:\s*0;[^}]*background:\s*transparent;/s);
    assert.match(css, /\.account-notification-trigger \.material-symbols-outlined\s*\{[^}]*font-size:\s*25px;/s);
    assert.match(css, /\.account-notification-badge\s*\{[^}]*top:\s*4px;[^}]*right:\s*4px;[^}]*width:\s*8px;[^}]*height:\s*8px;[^}]*border-radius:\s*999px;/s);
    assert.match(css, /\.account-notification-popover\s*\{[^}]*position:\s*absolute;[^}]*right:\s*0;/s);
    assert.match(css, /body\.is-logged-out\s+#btn-open-notifications\s*\{[^}]*display:\s*none;/s);
    assert.match(app, /isNotificationPopoverOpen:\s*false/);
    assert.match(app, /function getAccountNotificationItems\(\)/);
    assert.match(app, /getMissingLocationPhotos\(state\.savedPhotos\)/);
    assert.match(app, /getLikedPhotos\(\)/);
    assert.match(app, /badge\.textContent = '';/);
    assert.match(app, /badge\.setAttribute\('aria-label', `새 알림 \$\{actionableCount\}개`\)/);
    assert.match(app, /data-route="\$\{escapeHtml\(item\.route\)\}"/);
    assert.match(app, /\$\('#btn-open-notifications'\)\?\.addEventListener\('click', toggleAccountNotifications\)/);
});

test('top navigation keeps the existing bar with subtle separators', () => {
    assert.match(css, /\.site-header\s*\{[^}]*height:\s*64px;[^}]*border-bottom:\s*1px solid rgba\(26,\s*77,\s*78,\s*0\.08\);[^}]*box-shadow:\s*0 10px 24px rgba\(26,\s*77,\s*78,\s*0\.035\);/s);
    assert.match(css, /\.top-nav\s*\{[^}]*gap:\s*40px;/s);
    assert.match(css, /\.top-nav a\s*\{[^}]*font-size:\s*16px;[^}]*font-weight:\s*800;[^}]*padding:\s*20px 4px 17px;[^}]*border-radius:\s*8px;[^}]*background-image:\s*radial-gradient\(ellipse at center,\s*rgba\(26,\s*77,\s*78,\s*0\.064\)\s*0 36%,\s*rgba\(26,\s*77,\s*78,\s*0\.04\)\s*52%,\s*rgba\(26,\s*77,\s*78,\s*0\.02\)\s*68%,\s*rgba\(26,\s*77,\s*78,\s*0\.006\)\s*84%,\s*transparent 100%\);[^}]*background-size:\s*0 0;[^}]*transition:\s*background-size 150ms ease-out,\s*color 150ms ease-out;/s);
    assert.match(css, /\.top-nav a \+ a::before\s*\{[^}]*left:\s*-20px;[^}]*width:\s*1px;[^}]*height:\s*24px;[^}]*background:\s*rgba\(5,\s*5,\s*5,\s*0\.18\);/s);
    assert.match(css, /\.top-nav a::after\s*\{[^}]*bottom:\s*9px;[^}]*height:\s*2px;[^}]*opacity:\s*0;/s);
    assert.match(css, /\.top-nav a\.active\s*\{[^}]*background-color:\s*transparent;[^}]*color:\s*#050505;/s);
    assert.match(css, /\.top-nav a:hover\s*\{[^}]*background-size:\s*88px 48px;[^}]*color:\s*var\(--teal-dark\);/s);
    assert.match(css, /\.top-nav a:hover::after\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*scaleX\(1\);/s);
    assert.match(css, /\.top-nav a\.active::after\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*scaleX\(1\);/s);
    assert.match(css, /\.top-nav:has\(a:hover\) a\.active:not\(:hover\)::after\s*\{[^}]*opacity:\s*0;[^}]*transform:\s*scaleX\(0\.72\);/s);
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
    assert.match(app, /class="account-profile-field profile-edit-photo-field"/);
    assert.match(app, /class="profile-avatar-upload-control"/);
    assert.match(app, /class="profile-avatar-upload-preview"/);
    assert.match(app, /id="profile-avatar-upload-preview-image"/);
    assert.match(app, /id="profile-avatar-upload-preview-fallback"/);
    assert.match(app, /data-profile-avatar-upload-label/);
    assert.match(app, />사진 추가</);
    assert.match(css, /\.account-profile-fields\s*\{/);
    assert.match(css, /\.account-profile-field\s*\{/);
    assert.match(css, /\.account-profile-field input,\s*\.account-profile-field textarea\s*\{/s);
    assert.match(css, /\.profile-edit-photo-field\s*\{/);
    assert.match(css, /\.profile-avatar-upload-control\s*\{/);
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
    assert.match(app, /function clearAccountProfileAvatarPreview\(\)/);
    assert.match(app, /URL\.revokeObjectURL\(state\.accountProfileAvatarPreviewUrl\)/);
    assert.match(app, /state\.accountProfileAvatarPreviewUrl = previewUrl;/);
    assert.match(app, /\$\('#profile-avatar-upload-preview-image'\)/);
    assert.match(app, /\$\('#profile-avatar-upload-preview-fallback'\)/);
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
