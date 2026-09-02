import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('style.css', 'utf8');
const app = readFileSync('js/app.js', 'utf8');

test('public profile header does not render the numeric stats block', () => {
    assert.doesNotMatch(html, /profile-stats/);
    assert.doesNotMatch(app, /profile-stats/);
});

test('public profile card stays inside the cover as a legible information panel', () => {
    const cardStart = css.indexOf('.profile-card {');
    const cardEnd = css.indexOf('.large-avatar', cardStart);
    const cardCss = css.slice(cardStart, cardEnd);

    assert.match(cardCss, /grid-template-columns:\s*minmax\(0, 1fr\)/);
    assert.match(cardCss, /margin:\s*0 auto;/);
    assert.doesNotMatch(cardCss, /-\d+px/);
    assert.match(css, /\.profile-card\s*\{[^}]*border:\s*1px solid rgba\(26,\s*77,\s*78,\s*0\.14\);[^}]*border-radius:\s*16px;[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.88\);[^}]*box-shadow:\s*0 18px 48px rgba\(26,\s*77,\s*78,\s*0\.12\);[^}]*padding:\s*24px 26px;/s);
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
    assert.doesNotMatch(app, /id="profile-album-count"/);
    assert.match(app, />총 사진 <strong id="profile-photo-count">0<\/strong></);
    assert.match(app, />공개 중 <strong id="profile-public-count">0<\/strong></);
    assert.match(app, /class="profile-owner-actions"/);
    assert.match(css, /\.profile-owner-actions\s*\{/);
    assert.match(css, /\.profile-card-copy\s*\{/);
    assert.match(css, /\.account-profile-view\s*\{[^}]*padding:\s*0;[^}]*border:\s*0;[^}]*background:\s*transparent;/s);
});

test('own profile actions use a clear primary edit action and a quieter logout action', () => {
    const staticActionsStart = html.indexOf('class="profile-owner-actions"');
    const staticActionsEnd = html.indexOf('</div>', staticActionsStart);
    const staticActions = html.slice(staticActionsStart, staticActionsEnd);
    const shellStart = app.indexOf('function ensureProfileHeaderShell');
    const shellEnd = app.indexOf('function setAvatarDisplay', shellStart);
    const shell = app.slice(shellStart, shellEnd);

    assert.ok(staticActions.indexOf('id="account-profile-edit"') < staticActions.indexOf('id="account-profile-logout"'));
    assert.ok(shell.indexOf('id="account-profile-edit"') < shell.indexOf('id="account-profile-logout"'));
    assert.match(staticActions, /class="material-symbols-outlined"[^>]*>edit</);
    assert.match(staticActions, /class="material-symbols-outlined"[^>]*>logout</);
    assert.match(shell, /class="profile-action profile-action--edit"/);
    assert.match(shell, /class="profile-action profile-action--logout"/);
    assert.match(staticActions, />수정<\/span>/);
    assert.match(shell, />수정<\/span>/);
    assert.doesNotMatch(staticActions, />프로필 수정<\/span>/);
    assert.match(css, /\.profile-owner-actions\s*\{[^}]*flex-direction:\s*column;[^}]*align-items:\s*stretch;[^}]*justify-content:\s*flex-start;[^}]*gap:\s*8px;[^}]*align-self:\s*start;/s);
    assert.match(css, /\.profile-owner-actions \.profile-action\s*\{[^}]*width:\s*100%;/s);
    assert.match(css, /\.profile-action\s*\{[^}]*min-height:\s*40px;[^}]*border-radius:\s*8px;/s);
    assert.match(css, /\.profile-action--edit\s*\{[^}]*background:\s*var\(--teal\);[^}]*color:\s*#ffffff;/s);
    assert.match(css, /\.profile-action--logout\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.72\);/s);
});

test('profile biography and metrics remain legible over the cover image', () => {
    assert.match(css, /\.profile-card \.account-profile-bio\s*\{[^}]*color:\s*var\(--teal-dark\);[^}]*font-size:\s*17px;[^}]*font-weight:\s*700;/s);
    assert.match(css, /\.account-profile-metrics\s*\{[^}]*color:\s*rgba\(26,\s*77,\s*78,\s*0\.78\);[^}]*font-weight:\s*800;/s);
    assert.match(css, /\.account-profile-metrics strong\s*\{[^}]*color:\s*var\(--teal-dark\);[^}]*font-size:\s*20px;/s);
});

test('profile edit form has breathing room above the editing fields', () => {
    assert.match(css, /\.profile-cover\s*\{[^}]*padding:\s*24px 0 42px;/s);
    assert.match(css, /\.profile-edit-form\s*\{[^}]*max-width:\s*520px;[^}]*margin-top:\s*32px;[^}]*padding-top:\s*24px;[^}]*border-top:\s*1px solid rgba\(26,\s*77,\s*78,\s*0\.12\);/s);
    assert.match(css, /\.profile-edit-form \.auth-actions\s*\{[^}]*justify-self:\s*end;[^}]*width:\s*min\(280px,\s*100%\);/s);
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
    assert.match(css, /\.profile-title-row\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*gap:\s*14px;/s);
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
