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

test('public profile card stays inside the cover without negative overlap', () => {
    const cardStart = css.indexOf('.profile-card {');
    const cardEnd = css.indexOf('.large-avatar', cardStart);
    const cardCss = css.slice(cardStart, cardEnd);

    assert.match(cardCss, /grid-template-columns:\s*auto minmax\(0, 1fr\)/);
    assert.match(cardCss, /margin:\s*0 auto;/);
    assert.doesNotMatch(cardCss, /-\d+px/);
});

test('public profile header supports inline owner metadata and editing actions', () => {
    assert.match(app, /function ensureProfileHeaderShell\(\)/);
    assert.doesNotMatch(html, /Public Profile/);
    assert.doesNotMatch(app, /profile-eyebrow/);
    assert.doesNotMatch(app, /Public Profile/);
    assert.match(app, /id="profile-bio"/);
    assert.match(app, /id="profile-photo-count"/);
    assert.match(app, /id="profile-album-count"/);
    assert.match(app, /id="profile-public-count"/);
    assert.match(app, /class="profile-owner-actions"/);
    assert.match(css, /\.profile-owner-actions\s*\{/);
    assert.match(css, /\.profile-card-copy\s*\{/);
});

test('own profile actions sit together at the top right with logout first', () => {
    const staticActionsStart = html.indexOf('class="profile-owner-actions"');
    const staticActionsEnd = html.indexOf('</div>', staticActionsStart);
    const staticActions = html.slice(staticActionsStart, staticActionsEnd);
    const shellStart = app.indexOf('function ensureProfileHeaderShell');
    const shellEnd = app.indexOf('function setAvatarDisplay', shellStart);
    const shell = app.slice(shellStart, shellEnd);

    assert.ok(staticActions.indexOf('id="account-profile-logout"') < staticActions.indexOf('id="account-profile-edit"'));
    assert.ok(shell.indexOf('id="account-profile-logout"') < shell.indexOf('id="account-profile-edit"'));
    assert.match(css, /\.profile-owner-actions\s*\{[^}]*align-items:\s*center;[^}]*justify-content:\s*flex-end;[^}]*gap:\s*8px;[^}]*align-self:\s*start;/s);
    assert.match(css, /\.profile-owner-actions \.btn-secondary\s*\{[^}]*min-height:\s*38px;[^}]*border-radius:\s*999px;/s);
});

test('profile edit form has breathing room above the editing fields', () => {
    assert.match(css, /\.profile-edit-form\s*\{[^}]*max-width:\s*520px;[^}]*margin-top:\s*24px;[^}]*padding-top:\s*24px;[^}]*border-top:\s*1px solid rgba\(26,\s*77,\s*78,\s*0\.12\);/s);
    assert.match(css, /\.profile-edit-form \.auth-actions\s*\{[^}]*justify-self:\s*end;[^}]*width:\s*min\(280px,\s*100%\);/s);
});

test('profile edit mode keeps avatar beside account name and removes bio editing', () => {
    const shellStart = app.indexOf('function ensureProfileHeaderShell');
    const shellEnd = app.indexOf('function setAvatarDisplay', shellStart);
    const shell = app.slice(shellStart, shellEnd);

    assert.match(shell, /class="profile-edit-identity"/);
    assert.match(shell, /id="profile-edit-avatar-image"/);
    assert.match(shell, /id="profile-nickname-input"/);
    assert.ok(shell.indexOf('id="profile-edit-avatar-image"') < shell.indexOf('id="profile-nickname-input"'));
    assert.doesNotMatch(shell, /id="profile-bio-input"/);
    assert.doesNotMatch(shell, /<textarea/);
    assert.match(css, /\.profile-edit-identity\s*\{[^}]*grid-template-columns:\s*auto minmax\(0,\s*1fr\);[^}]*padding:\s*12px;/s);
    assert.match(css, /\.profile-edit-avatar\s*\{[^}]*width:\s*64px;[^}]*height:\s*64px;/s);
});

test('profile avatar renderers preserve the image and fallback structure', () => {
    const emptyStart = app.indexOf('function renderEmptyPublicSurfaces');
    const emptyEnd = app.indexOf('function renderPublicOwnerProfile', emptyStart);
    const emptyRenderer = app.slice(emptyStart, emptyEnd);
    const ownerStart = app.indexOf('function renderPublicOwnerProfile');
    const ownerEnd = app.indexOf('function renderProfileMap', ownerStart);
    const ownerRenderer = app.slice(ownerStart, ownerEnd);

    assert.doesNotMatch(emptyRenderer, /\.profile-card \.avatar/);
    assert.match(emptyRenderer, /\$\('#profile-edit-avatar-image'\)/);
    assert.match(ownerRenderer, /\$\('#profile-edit-avatar-image'\)/);
});
