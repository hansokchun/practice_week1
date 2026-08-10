import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const app = readFileSync('js/app.js', 'utf8');

test('profile trigger has an accessible name and static ids are unique', () => {
    assert.match(html, /id="btn-open-profile"[^>]*aria-label="내 프로필 열기"/);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length);
    assert.doesNotMatch(html, /id="account-profile-modal"/);
});

test('modal lifecycle moves, traps, and restores keyboard focus', () => {
    assert.match(app, /let lastModalTrigger = null/);
    assert.match(app, /function getModalFocusableElements\(modal\)/);
    assert.match(app, /window\.requestAnimationFrame\(\(\) => getModalFocusableElements\(modal\)\[0\]\?\.focus\(\)\)/);
    assert.match(app, /lastModalTrigger\?\.isConnected/);
    assert.match(app, /event\.key === 'Escape' && activeModal/);
    assert.match(app, /event\.key === 'Tab' && activeModal/);
});

test('album compose fields keep each label with its own control', () => {
    assert.match(app, /<label class="album-compose-field" for="album-name-input">[\s\S]*<span>앨범 이름<\/span>[\s\S]*<input id="album-name-input"/);
    assert.match(app, /<label class="album-compose-field" for="album-note-input">[\s\S]*<span>설명<\/span>[\s\S]*<textarea id="album-note-input"/);
});
