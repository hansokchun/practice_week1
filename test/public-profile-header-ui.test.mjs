import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('style.css', 'utf8');
const app = readFileSync('js/app.js', 'utf8');

test('profile information follows nickname, metrics, then biography with shared page background', () => {
    const shell = app.slice(app.indexOf('function ensureProfileHeaderShell'), app.indexOf('function setAvatarDisplay'));
    assert.ok(shell.indexOf('id="profile-title"') < shell.indexOf('class="account-profile-metrics"'));
    assert.ok(shell.indexOf('class="account-profile-metrics"') < shell.indexOf('id="profile-bio"'));
    assert.match(css, /\.profile-title-row h1\s*\{[^}]*margin:\s*32px 0 0;/s);
    assert.match(css, /\.page\s*\{[^}]*background:\s*var\(--bg\);/s);
    assert.match(css, /\.profile-cover\s*\{[^}]*background:\s*var\(--bg\);/s);
});

test('public profile header does not render the numeric stats block', () => {
    assert.doesNotMatch(html, /profile-stats/);
    assert.doesNotMatch(app, /profile-stats/);
});

test('public profile card stays inside the cover as a legible information panel', () => {

    assert.match(css, /\.profile-cover\s*\{[^}]*--profile-cover-height:\s*280px;[^}]*padding:\s*var\(--profile-cover-height\) 0 0;/s);
    assert.match(css, /\.profile-cover > img\s*\{[^}]*height:\s*var\(--profile-cover-height\);/s);
    assert.match(css, /\.profile-avatar-pick\s*\{[^}]*margin-top:\s*calc\(var\(--profile-avatar-size\) \/ -2\);/s);
    assert.match(css, /\.profile-card\s*\{[^}]*border:\s*0;[^}]*background:\s*transparent;/s);
});

test('public profile header supports inline owner metadata and editing actions', () => {
    assert.match(app, /function ensureProfileHeaderShell\(\)/);
    assert.doesNotMatch(html, /Public Profile/);
    assert.doesNotMatch(app, /profile-eyebrow/);
    assert.doesNotMatch(app, /Public Profile/);
    assert.doesNotMatch(app, /공개한 사진을 모아 볼 수 있는 프로필입니다/);
    assert.match(app, /id="profile-bio"/);
    assert.match(app, /id="profile-photo-count"/);
    assert.match(app, /id="profile-public-count"/);
    assert.match(app, /id="profile-like-count"/);
    assert.doesNotMatch(app, /id="profile-album-count"/);
    assert.match(app, />등록한 사진 <strong id="profile-photo-count">0<\/strong></);
    assert.match(app, />공개 중인 사진 <strong id="profile-public-count">0<\/strong></);
    assert.match(app, /class="profile-owner-actions"/);
    assert.match(css, /\.profile-owner-actions\s*\{/);
    assert.match(css, /\.profile-card-copy\s*\{/);
    assert.match(css, /\.account-profile-view\s*\{[^}]*padding:\s*0;[^}]*border:\s*0;[^}]*background:\s*transparent;/s);
});

test('own profile actions use a clear primary edit action and a quieter logout action', () => {

    const shell = app.slice(app.indexOf('function ensureProfileHeaderShell'), app.indexOf('function setAvatarDisplay'));
    assert.match(shell, /id="account-profile-edit"[^>]*aria-label="프로필 수정"[^>]*title="프로필 수정"/);
    assert.doesNotMatch(shell, />수정<\/span>|id="account-profile-logout"/);
    const menu = html.slice(html.indexOf('id="account-menu-popover"'), html.indexOf('</header>'));
    assert.ok(menu.indexOf('id="account-profile-logout"') > menu.indexOf('data-account-route="settings"'));
    assert.equal((html.match(/id="account-profile-logout"/g) || []).length, 1);
    assert.match(css, /\.profile-owner-actions\s*\{[^}]*position:\s*absolute;[^}]*top:\s*-60px;[^}]*right:\s*0;/s);
    assert.match(css, /\.profile-owner-actions \.profile-action\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/s);
});

test('profile biography and metrics remain legible over the cover image', () => {
    assert.match(css, /\.profile-card \.account-profile-bio\s*\{[^}]*color:\s*var\(--teal-dark\);[^}]*font-size:\s*17px;[^}]*font-weight:\s*700;/s);
    assert.match(css, /\.account-profile-metrics\s*\{[^}]*color:\s*rgba\(26,\s*77,\s*78,\s*0\.78\);[^}]*font-weight:\s*800;/s);
    assert.match(css, /\.account-profile-metrics strong\s*\{[^}]*color:\s*var\(--teal-dark\);[^}]*font-size:\s*20px;/s);
});

test('profile edit form has breathing room above the editing fields', () => {
    assert.match(css, /\.profile-cover\s*\{[^}]*padding:\s*var\(--profile-cover-height\) 0 0;/s);
    assert.match(css, /\.profile-edit-form\s*\{[^}]*max-width:\s*520px;[^}]*margin-top:\s*32px;[^}]*padding-top:\s*24px;[^}]*border-top:\s*1px solid rgba\(26,\s*77,\s*78,\s*0\.12\);/s);
    assert.match(css, /\.profile-edit-form \.auth-actions\s*\{[^}]*justify-self:\s*end;[^}]*width:\s*min\(280px,\s*100%\);/s);
});

test('profile edit mode reserves a separate cover action row without overlapping the profile card', () => {
    assert.match(css, /\.profile-header-view\[hidden\],\s*\.profile-owner-actions \.profile-action\[hidden\]\s*\{\s*display:\s*none;/);

    assert.match(app, /profileCover\?\.classList\.toggle\('is-editing', state\.accountProfileEditMode\)/);
    assert.doesNotMatch(app, /logoutButton\.hidden = state\.accountProfileEditMode/);
    assert.match(css, /\.profile-cover\.is-editing\s*\{[^}]*padding-top:\s*var\(--profile-cover-height\);/s);
    assert.match(css, /\.profile-cover-edit-trigger\s*\{[^}]*top:\s*24px;/s);
});

test('profile edit mode keeps the profile avatar beside the account name and removes the extra edit circle', () => {
    const shellStart = app.indexOf('function ensureProfileHeaderShell');
    const shellEnd = app.indexOf('function setAvatarDisplay', shellStart);
    const shell = app.slice(shellStart, shellEnd);

    assert.match(shell, /class="profile-title-row"/);
    assert.match(shell, /id="profile-avatar" class="avatar large-avatar account-profile-avatar profile-avatar-pick"/);
    assert.match(shell, /id="profile-nickname-input"/);
    assert.match(shell, /class="account-profile-field profile-edit-photo-field"/);
    assert.match(shell, /class="profile-avatar-upload-control"/);
    assert.match(shell, /class="profile-avatar-upload-preview"/);
    assert.ok(shell.indexOf('id="profile-avatar"') < shell.indexOf('id="profile-title"'));
    assert.ok(shell.indexOf('id="profile-nickname-input"') < shell.indexOf('profile-avatar-upload-control'));
    assert.doesNotMatch(shell, /profile-edit-avatar/);
    assert.doesNotMatch(shell, /profile-edit-avatar-pick/);
    assert.doesNotMatch(shell, /id="profile-bio-input"/);
    assert.doesNotMatch(shell, /<textarea/);
    assert.match(css, /\.profile-title-row\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*flex-start;[^}]*gap:\s*24px;/s);
    assert.match(css, /\.profile-avatar-file-input\s*\{[^}]*display:\s*none;/s);
    assert.match(css, /\.profile-card\.is-editing \.profile-avatar-pick\s*\{[^}]*box-shadow:\s*0 0 0 3px rgba\(26,\s*77,\s*78,\s*0\.12\);/s);
    assert.match(css, /\.profile-edit-photo-field\s*\{[^}]*grid-template-columns:\s*1fr auto;/s);
});

test('profile avatar renderers preserve the image and fallback structure', () => {
    const emptyStart = app.indexOf('function renderEmptyPublicSurfaces');
    const emptyEnd = app.indexOf('function renderPublicOwnerProfile', emptyStart);
    const emptyRenderer = app.slice(emptyStart, emptyEnd);
    const ownerStart = app.indexOf('function renderPublicOwnerProfile');
    const ownerEnd = app.indexOf('function renderProfileMap', ownerStart);
    const ownerRenderer = app.slice(ownerStart, ownerEnd);

    assert.doesNotMatch(emptyRenderer, /\.profile-card \.avatar/);
    assert.match(emptyRenderer, /\$\('#profile-avatar-image'\)/);
    assert.match(ownerRenderer, /\$\('#profile-avatar-image'\)/);
    assert.doesNotMatch(app, /\$\$\(\'\.public-author-card \.avatar, \.profile-card \.avatar, \.pin-author \.avatar\'\)/);
});
