import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

test('a numberless header dot replaces the guest popup and retains the native action', () => {
    const entry = html.match(/<button id="btn-header-upload"[\s\S]*?<\/button>/)?.[0] || '';
    assert.match(entry, /type="button"/);
    assert.match(entry, /나만의 지도 만들기/);
    assert.match(entry, /id="header-map-dot" class="header-map-dot" aria-hidden="true" hidden><\/span>/);
    assert.doesNotMatch(html, /guest-map-invitation|btn-open-guest-map-invitation|btn-dismiss-guest-map-invitation/);
    assert.doesNotMatch(app, /guestMapInvitation|syncGuestMapInvitation|createGuestMapInvitationState/);
    assert.ok(app.includes("$('#btn-header-upload')?.addEventListener('click', openHeaderUpload)"));
});

test('the map dot is a small red corner indicator, not another clickable target', () => {
    const dot = css.match(/\.header-map-dot\s*\{([^}]+)\}/s)?.[1] || '';
    assert.match(dot, /position: absolute/);
    assert.match(dot, /top: -3px/);
    assert.match(dot, /right: -3px/);
    assert.match(dot, /width: 14px/);
    assert.match(dot, /height: 14px/);
    assert.match(dot, /background: var\(--notification-red\)/);
    assert.match(dot, /pointer-events: none/);
    assert.match(css, /\.header-map-dot\[hidden\]/);
    assert.match(app, /dot\.hidden = !shouldShowHeaderMapDot/);
});

test('notification badges render capped labels and preserve the real accessible count', () => {
    assert.match(app, /badge\.textContent = getAccountNotificationBadgeLabel\(actionableCount\)/);
    assert.ok(app.includes('`새 알림 ${actionableCount}개`'));
    const badge = css.match(/\.account-notification-badge\s*\{([^}]+)\}/s)?.[1] || '';
    assert.match(badge, /min-width: 18px/);
    assert.match(badge, /height: 18px/);
    assert.match(badge, /background: var\(--notification-red\)/);
    assert.match(badge, /color: #ffffff/);
});
