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
    assert.match(entry, /나만 아는 장소로 지도를 만들어보세요!/);
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

test('guest callout and header enter the same map creation flow', () => {
    for (const id of ['btn-header-upload', 'btn-open-guest-map-invitation']) {
        assert.ok(app.includes(`$('#${id}')?.addEventListener('click', openHeaderUpload)`), id);
    }
});
