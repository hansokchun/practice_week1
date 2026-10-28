import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

test('guest callout has a keyboard-operable entry separate from its dismiss button', () => {
    const invitation = html.match(/<aside id="guest-map-invitation"[\s\S]*?<\/aside>/)?.[0] || '';
    const entry = invitation.match(/<button id="btn-open-guest-map-invitation"[\s\S]*?<\/button>/)?.[0] || '';
    assert.ok(entry, 'the invitation body needs a native button');
    assert.match(entry, /type="button"/);
    assert.match(entry, /첫 사진으로 지도를 시작해보세요/);
    assert.match(entry, /로그인 없이 3장까지 체험할 수 있어요/);
    assert.match(entry, /나만의 지도 만들기/);
    assert.match(entry, /guest-map-invitation-cta/);
    assert.match(entry, /images\/logo\.png/);
    assert.doesNotMatch(entry, /btn-dismiss-guest-map-invitation/);
    assert.match(invitation, /<button id="btn-dismiss-guest-map-invitation"[^>]*aria-label="지도 만들기 안내 닫기"/);
    const close = invitation.match(/<button id="btn-dismiss-guest-map-invitation"[^>]*>/)?.[0] || '';
    assert.match(close, /title="지도 만들기 안내 닫기"/);
});

test('the plain X acknowledges a press without adding a tile', () => {
    const pressed = css.match(/#btn-dismiss-guest-map-invitation:active\s*\{([^}]+)\}/s)?.[1] || '';
    assert.match(pressed, /opacity:\s*0\.\d+/);
    assert.doesNotMatch(pressed, /background|border:/);
});

test('guest callout makes the map action the visual destination', () => {
    assert.match(css, /\.guest-map-invitation-cta\s*\{[^}]*background:\s*var\(--teal\);[^}]*color:\s*#ffffff;/s);
    assert.match(css, /\.guest-map-invitation-action:hover \.guest-map-invitation-cta\s*\{[^}]*transform:\s*translateX\(2px\);/s);
});

test('guest callout and header enter the same map creation flow', () => {
    for (const id of ['btn-header-upload', 'btn-open-guest-map-invitation']) {
        assert.ok(app.includes(`$('#${id}')?.addEventListener('click', openHeaderUpload)`), id);
    }
});

test('opening the photo trial removes the callout behind the modal', () => {
    const openTrial = app.match(/async function openPhotoTrial\(\) \{([\s\S]*?)\n\}/)?.[1] || '';
    assert.match(openTrial, /guestMapInvitation\.dismiss\(\);/);
    assert.match(openTrial, /syncGuestMapInvitation\(\);/);
    assert.ok(openTrial.indexOf('guestMapInvitation.dismiss()') < openTrial.indexOf("openModal('#photo-trial-modal')"));
});
