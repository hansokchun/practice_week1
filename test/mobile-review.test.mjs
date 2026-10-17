import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as actions from '../js/native-content-actions.mjs';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
function extract(name) {
    const start = source.search(new RegExp(`(?:async\\s+)?function ${name}\\(`));
    assert.ok(start >= 0, name);
    return source.slice(start, source.indexOf('\n}', start) + 2);
}

test('email auth is a focused step with a way back, preserving mode and input', () => {
    const nodes = new Map();
    const $ = selector => {
        if (!nodes.has(selector)) nodes.set(selector, { hidden: false, value: 'preserve', lastChild: {}, focus() { this.focused = true; } });
        return nodes.get(selector);
    };
    let challenges = 0;
    const state = {};
    const api = runInNewContext(['showAuthMethodChoices', 'setAuthMode', 'showEmailAuthForm'].map(extract).join('\n')
        + ';({showAuthMethodChoices,setAuthMode,showEmailAuthForm})', { $, state, initTurnstile: () => challenges++ });
    for (const mode of ['login', 'signup']) {
        api.setAuthMode(mode);
        assert.equal($('.social-login').hidden, false);
        api.showEmailAuthForm();
        assert.equal($('#auth-form').hidden, false);
        assert.equal($('.social-login').hidden, true);
        assert.equal($('.auth-mode-switch').hidden, true);
        assert.equal($('#btn-auth-methods').hidden, false);
        assert.equal($('#email-input').focused, true);
        assert.equal($('#btn-email-submit').textContent, mode === 'login' ? '로그인' : '회원가입');
        api.showAuthMethodChoices();
        assert.equal($('#auth-form').hidden, true);
        assert.equal($('#btn-auth-methods').hidden, true);
        assert.equal($('.social-login').hidden, false);
        assert.equal(state.authMode, mode);
        assert.equal($('#email-input').value, 'preserve');
    }
    assert.equal(challenges, 2);
});

function plugins() {
    const calls = [];
    return { calls, capacitor: { isNativePlatform: () => true },
        loadFilesystem: async () => ({ Directory: { Cache: 'CACHE' }, Filesystem: {
            writeFile: async value => calls.push(['write', value]),
            getUri: async () => ({ uri: 'file:///cache/album.html' })
        } }),
        loadShare: async () => ({ share: async value => calls.push(['share', value]) }) };
}
const album = () => new Blob(['<!doctype html><p>여행</p>'], { type: 'text/html;charset=utf-8' });

test('native album saves exact HTML bytes to cache and opens file sharing, not gallery success', async () => {
    const p = plugins();
    const blob = album();
    const result = await actions.saveNativeAlbum(blob, '../../서울 여행.html', p);
    assert.equal(result.error, null);
    assert.equal(result.data.status, 'shared');
    assert.equal(result.data.fileName, '서울-여행.html');
    const write = p.calls[0][1];
    assert.equal(write.directory, 'CACHE');
    assert.equal(Buffer.from(write.data, 'base64').toString(), await blob.text());
    assert.match(write.path, /^downloads\/[^/]+\/서울-여행\.html$/);
    assert.deepEqual(p.calls[1][1].files, ['file:///cache/album.html']);
});

test('album rejects invalid type/size without loading plugins and is a no-op on web', async () => {
    for (const blob of [new Blob(), new Blob(['x'], { type: 'image/png' }), { size: 32 * 1024 * 1024 + 1, type: 'text/html' }]) {
        const p = plugins();
        assert.ok((await actions.saveNativeAlbum(blob, 'a.html', p)).error);
        assert.equal(p.calls.length, 0);
    }
    assert.equal((await actions.saveNativeAlbum(album(), 'a.html', { capacitor: { isNativePlatform: () => false } })).handled, false);
});

test('closing the album or changing account during preparation never opens a stale share sheet', async () => {
    for (const stage of ['read', 'write', 'loadShare']) {
        let active = true;
        const p = plugins();
        p.isActive = () => active;
        p.readBlob = async blob => { if (stage === 'read') active = false; return Buffer.from(await blob.arrayBuffer()).toString('base64'); };
        const load = p.loadFilesystem;
        p.loadFilesystem = async () => {
            const fs = await load();
            const write = fs.Filesystem.writeFile;
            fs.Filesystem.writeFile = async value => { await write(value); if (stage === 'write') active = false; };
            return fs;
        };
        const share = p.loadShare;
        p.loadShare = async () => { if (stage === 'loadShare') active = false; return share(); };
        const result = await actions.saveNativeAlbum(album(), 'a.html', p);
        assert.equal(result.data.status, 'cancelled');
        assert.equal(p.calls.some(([type]) => type === 'share'), false);
    }
});

test('album cancellation and plugin failures do not leak paths or provider details', async () => {
    for (const [error, cancelled] of [[{ code: 'USER_CANCELLED' }, true], [Error('secret /private/path'), false]]) {
        const p = plugins();
        p.loadShare = async () => ({ share: async () => { throw error; } });
        const result = await actions.saveNativeAlbum(album(), 'a.html', p);
        if (cancelled) assert.equal(result.data.status, 'cancelled');
        else { assert.ok(result.error); assert.doesNotMatch(result.error.message, /secret|private/); }
    }
});

test('native album UI requires a separate save click and invalidates ready files on modal close', () => {
    assert.doesNotMatch(source, /!document\.documentElement\.classList\.contains\('native-app'\) \? `<button id="btn-download-album"/);
    assert.match(source, /album-download-native-save.*addEventListener\('click', savePreparedNativeAlbum\)/);
    assert.match(extract('closeModals'), /albumDownloadReady = null/);
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /id="album-download-native-save"[^>]*hidden/);
});

test('author buttons are never registered as album-selection controls', () => {
    assert.equal(source.includes("$$('[data-public-album-id]').forEach"), false,
        'Broad binding catches the photo author button and rerenders it to a different owner before delegated navigation');
    const state = {};
    const window = { location: { hash: '#/' } };
    const route = runInNewContext(extract('routeToProfileFromAuthor') + ';routeToProfileFromAuthor', {
        state, window,
        getPublicAlbums: () => [{ id: 'other-album', owner_id: 'other-owner' }],
        buildOwnerProfileHash: owner => `#/profile?owner=${owner}`,
        renderRoute: () => { throw Error('Unexpected render'); }
    });
    route('', 'photo-owner');
    assert.equal(window.location.hash, '#/profile?owner=photo-owner');
    assert.equal(state.selectedPublicOwnerId, 'photo-owner');
});

test('save button blocks duplicate taps and suppresses stale result messages', async () => {
    let resolve;
    let calls = 0;
    const button = { disabled: false };
    const status = { textContent: '' };
    const context = { $: selector => selector === '#album-download-native-save' ? button : status,
        saveNativeAlbum: () => { calls++; return new Promise(done => { resolve = done; }); } };
    const api = runInNewContext('let albumDownloadReady;\n' + extract('savePreparedNativeAlbum')
        + ';({save:savePreparedNativeAlbum,set:ready=>albumDownloadReady=ready})', context);
    let active = true;
    const ready = { blob: album(), fileName: 'album.html', saving: false, isActive: () => active };
    api.set(ready);
    const pending = api.save();
    await api.save();
    assert.equal(calls, 1);
    assert.equal(button.disabled, true);
    active = false;
    api.set(null);
    status.textContent = 'next dialog';
    resolve({ handled: true, data: { status: 'shared' } });
    await pending;
    assert.equal(status.textContent, 'next dialog');
});

test('photo reporting opens an explicit feedback draft instead of pretending submission succeeded', () => {
    assert.equal(source.includes("showToast('신고가 접수되었습니다. 검토 후 조치하겠습니다.')"), false);
    const nodes = { '#feedback-message': { value: '', focus() { this.focused = true; } },
        '#feedback-message-status': {}, '#feedback-form [value="other"]': {} };
    const opened = [];
    const state = { currentUser: null };
    const report = runInNewContext(extract('openPhotoReport') + ';openPhotoReport', {
        state, $: selector => nodes[selector], closeModals: () => {},
        openProductFeedbackDialog: () => opened.push(state.currentUser ? 'feedback' : 'auth'),
        syncFeedbackMessageCount: () => {}, showToast: () => {}
    });
    report('photo-123');
    assert.deepEqual(opened, ['auth']);
    assert.equal(nodes['#feedback-message'].value, '');
    state.currentUser = { id: 'viewer' };
    report('photo-123');
    assert.deepEqual(opened, ['auth', 'feedback']);
    assert.match(nodes['#feedback-message'].value, /photo-123/);
    assert.equal(nodes['#feedback-form [value="other"]'].checked, true);
    assert.equal(nodes['#feedback-message'].focused, true);
});
