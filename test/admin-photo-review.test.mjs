import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminPhotoReviewController, isAdminOriginalUrl, renderAdminPhotoReview } from '../js/admin-photo-review.mjs';

const signed = 'https://pqczcponriukilrtpbdl.supabase.co/storage/v1/object/sign/photos/owner/image.jpg?token=temporary';
const photo = { id: 'photo-1', title: '작은 골목', visibility: 'private', created_at: '2026-10-30T16:00:00Z', owner_id: 'owner', ownerNickname: '작가', thumbnailUrl: signed };
function fixture(overrides = {}) {
    const nodes = new Map();
    globalThis.document = { getElementById(id) {
        if (!nodes.has(id)) nodes.set(id, { textContent: '', innerHTML: '', value: '', hidden: false, disabled: false, open: false, attrs: {}, listeners: {},
            addEventListener(type, callback) { this.listeners[type] = callback; },
            setAttribute(key, value) { this.attrs[key] = value; }, removeAttribute(key) { delete this.attrs[key]; }, getAttribute(key) { return this.attrs[key] ?? null; },
            showModal() { this.open = true; }, close() { this.open = false; this.listeners.close?.(); }, scrollIntoView() { this.scrolled = true; } });
        return nodes.get(id);
    } };
    let user = { id: 'admin', app_metadata: { role: 'admin' } };
    const requests = [], originals = [], selected = [];
    const controller = createAdminPhotoReviewController({ getUser: () => user,
        fetchPhotos: async options => { requests.push(options); return { data: { photos: [photo], total: 15, page: options.page, pageSize: 12 } }; },
        fetchOriginal: async id => { originals.push(id); return { data: { url: signed, expiresIn: 60 } }; },
        selectAccount: id => selected.push(id), ...overrides });
    controller.bind();
    const node = id => document.getElementById(id);
    const click = (selector, dataset = {}) => node('page-admin-accounts').listeners.click({ target: { closest: value => value === selector ? { dataset } : null } });
    const settle = () => new Promise(resolve => setImmediate(resolve));
    return { controller, node, requests, originals, selected, click, settle, setUser: value => { user = value; } };
}

test('photo cards escape member content and keep originals as explicit actions', () => {
    const html = renderAdminPhotoReview([{ ...photo, title: '<script>"', ownerNickname: '<owner>' }]);
    assert.match(html, /&lt;script&gt;&quot;/);
    assert.match(html, /&lt;owner&gt;/);
    assert.match(html, /class="admin-review-photo-owner"[^>]*title="&lt;owner&gt;"/);
    assert.match(html, /비공개/);
    assert.match(html, /2026\. 10\. 31\./);
    assert.match(html, /<time datetime="2026-10-30T16:00:00\.000Z"><span>2026\. 10\. 31\.<\/span><span>(?:오전|AM) 01:00<\/span><\/time>/);
    assert.match(html, /data-admin-photo-original="photo-1"/);
    assert.match(html, /loading="lazy"/);
    assert.doesNotMatch(html, /<script>|storage_path|undefined/);
    assert.match(renderAdminPhotoReview([]), /사진이 없습니다/);
});

test('link-only photos keep their distinct link-public visibility label', () => {
    const html = renderAdminPhotoReview([{ ...photo, visibility: 'link' }]);
    assert.match(html, />링크공개</);
    assert.doesNotMatch(html, />비공개</);
});

test('original URL boundary permits only signed photos on the exact project', () => {
    assert.equal(isAdminOriginalUrl(signed), true);
    for (const url of ['javascript:alert(1)', signed.replace('https:', 'http:'), signed.replace('pqczcponriukilrtpbdl', 'foreign'),
        signed.replace('/sign/photos/', '/public/photos/'), signed.replace('?token=temporary', ''), signed.replace('token=temporary', 'token='),
        signed.replace('.supabase.co', '.supabase.co.evil.example'), signed.replace('https://', 'https://user:pass@')]) assert.equal(isAdminOriginalUrl(url), false, url);
    assert.doesNotMatch(renderAdminPhotoReview([{ ...photo, thumbnailUrl: 'javascript:alert(1)' }]), /src="javascript:/);
});

test('latest photos paginate without prefetching originals; day and owner scopes reset pages', async () => {
    const f = fixture();
    await f.controller.load();
    assert.deepEqual(f.requests, [{ page: 1 }]);
    assert.deepEqual(f.originals, []);
    assert.equal(f.node('admin-photo-review-next').disabled, false);
    f.node('admin-photo-review-next').listeners.click(); await f.settle();
    assert.equal(f.requests.at(-1).page, 2);
    f.click('[data-admin-photo-day]', { adminPhotoDay: '2026-10-31' }); await f.settle();
    assert.deepEqual(f.requests.at(-1), { page: 1, day: '2026-10-31' });
    assert.equal(f.node('admin-photo-review').scrolled, true);
    await f.controller.filterOwner('owner', '작가');
    assert.deepEqual(f.requests.at(-1), { page: 1, ownerId: 'owner' });
    assert.equal(f.node('admin-photo-day').value, '');
    f.click('[data-admin-photo-account]', { adminPhotoAccount: 'owner' });
    assert.deepEqual(f.selected, ['owner']);
    f.node('admin-photo-filter-reset').listeners.click(); await f.settle();
    assert.deepEqual(f.requests.at(-1), { page: 1 });
});

test('form uses the chosen date and invalid calendar input is rejected before fetch', async () => {
    const f = fixture(); await f.controller.load();
    f.node('admin-photo-day').value = '2026-10-31';
    await f.node('admin-photo-review-form').listeners.submit({ preventDefault() {} });
    assert.deepEqual(f.requests.at(-1), { page: 1, day: '2026-10-31' });
    const count = f.requests.length;
    for (const day of ['2026-02-30', '2026-99-20', 'not-a-day']) {
        f.node('admin-photo-day').value = day;
        await f.node('admin-photo-review-form').listeners.submit({ preventDefault() {} });
    }
    assert.equal(f.requests.length, count);
    assert.match(f.node('admin-photo-review-status').textContent, /날짜/);
});

test('server failures remain distinct from empty photos and do not expose raw diagnostics', async () => {
    const f = fixture({ fetchPhotos: async () => ({ data: null, error: new Error('secret provider diagnostics') }) });
    await f.controller.load();
    assert.match(f.node('admin-photo-review-status').textContent, /불러오지 못했어요/);
    assert.doesNotMatch(f.node('admin-photo-review-status').textContent, /secret|사진이 없습니다/);
    assert.equal(f.node('admin-photo-review-list').innerHTML, '');
    assert.equal(f.node('admin-photo-review-next').disabled, true);
});

test('original opens on demand and closing removes every temporary URL', async () => {
    const f = fixture(); await f.controller.load();
    f.click('[data-admin-photo-original]', { adminPhotoOriginal: 'photo-1', adminPhotoTitle: '작은 골목' }); await f.settle();
    assert.deepEqual(f.originals, ['photo-1']);
    assert.equal(f.node('admin-photo-original-dialog').open, true);
    assert.equal(f.node('admin-photo-original-image').getAttribute('src'), signed);
    assert.equal(f.node('admin-photo-original-link').getAttribute('href'), signed);
    assert.equal(f.node('admin-photo-original-image').hidden, false);
    f.node('admin-photo-original-image').onerror();
    assert.match(f.node('admin-photo-original-status').textContent, /새 탭/);
    f.node('admin-photo-original-close').listeners.click();
    assert.equal(f.node('admin-photo-original-dialog').open, false);
    assert.equal(f.node('admin-photo-original-image').getAttribute('src'), null);
    assert.equal(f.node('admin-photo-original-link').getAttribute('href'), null);
    assert.equal(f.node('admin-photo-original-image').hidden, true);
});

test('original failures and foreign signed URLs never reach an image or anchor', async () => {
    for (const result of [{ data: null, error: new Error('secret') }, { data: { url: signed.replace('pqczcponriukilrtpbdl', 'foreign') } }]) {
        const f = fixture({ fetchOriginal: async () => result }); await f.controller.load();
        f.click('[data-admin-photo-original]', { adminPhotoOriginal: 'photo-1' }); await f.settle();
        assert.equal(f.node('admin-photo-original-image').getAttribute('src'), null);
        assert.equal(f.node('admin-photo-original-link').getAttribute('href'), null);
        assert.match(f.node('admin-photo-original-status').textContent, /불러오지 못했어요/);
        assert.doesNotMatch(f.node('admin-photo-original-status').textContent, /secret|foreign/);
    }
});

test('close, route clear and role loss invalidate delayed private original responses', async () => {
    for (const reason of ['close', 'cancel', 'clear', 'role', 'actor']) {
        let resolve;
        const f = fixture({ fetchOriginal: () => new Promise(done => { resolve = done; }) }); await f.controller.load();
        f.click('[data-admin-photo-original]', { adminPhotoOriginal: 'photo-1' });
        if (reason === 'close') f.node('admin-photo-original-close').listeners.click();
        if (reason === 'cancel') f.node('admin-photo-original-dialog').listeners.cancel();
        if (reason === 'clear') f.controller.clear();
        if (reason === 'role') f.setUser({ id: 'admin', app_metadata: { role: 'member' } });
        if (reason === 'actor') f.setUser({ id: 'other-admin', app_metadata: { role: 'admin' } });
        resolve({ data: { url: signed, expiresIn: 60 } }); await f.settle();
        assert.equal(f.node('admin-photo-original-image').getAttribute('src'), null, reason);
        assert.equal(f.node('admin-photo-original-link').getAttribute('href'), null, reason);
    }
});

test('stale list responses and nonadmin entry never expose private cards', async () => {
    let resolve, calls = 0;
    const f = fixture({ fetchPhotos: () => { calls++; return new Promise(done => { resolve = done; }); } });
    const pending = f.controller.load();
    f.controller.clear(); f.setUser(null);
    resolve({ data: { photos: [photo], total: 1 } }); await pending;
    assert.equal(f.node('admin-photo-review-list').innerHTML, '');
    f.setUser({ id: 'member', app_metadata: {} }); await f.controller.load();
    assert.equal(calls, 1);
    assert.equal(f.node('admin-photo-review-list').innerHTML, '');
});

test('a newer filter response wins over an earlier pending request', async () => {
    const resolvers = [];
    const f = fixture({ fetchPhotos: () => new Promise(done => resolvers.push(done)) });
    const old = f.controller.load();
    const latest = f.controller.filterOwner('new-owner', '다른 작가');
    resolvers[1]({ data: { photos: [{ ...photo, title: '새 사진' }], total: 1 } }); await latest;
    resolvers[0]({ data: { photos: [{ ...photo, title: '오래된 사진' }], total: 1 } }); await old;
    assert.match(f.node('admin-photo-review-list').innerHTML, /새 사진/);
    assert.doesNotMatch(f.node('admin-photo-review-list').innerHTML, /오래된 사진/);
});

test('actor synchronization clears settled originals after account changes or role loss', async () => {
    for (const user of [{ id: 'other-admin', app_metadata: { role: 'admin' } }, { id: 'admin', app_metadata: { role: 'member' } }, null]) {
        const f = fixture(); await f.controller.load();
        f.click('[data-admin-photo-original]', { adminPhotoOriginal: 'photo-1' }); await f.settle();
        assert.equal(f.node('admin-photo-original-image').getAttribute('src'), signed);
        f.setUser(user);
        assert.equal(f.controller.syncActor(), true);
        assert.equal(f.node('admin-photo-original-image').getAttribute('src'), null);
        assert.equal(f.node('admin-photo-original-link').getAttribute('href'), null);
        assert.equal(f.node('admin-photo-original-dialog').open, false);
        assert.equal(f.node('admin-photo-review-list').innerHTML, '');
        assert.equal(f.requests.length, 1);
        assert.equal(f.originals.length, 1);
    }
});

test('actor synchronization preserves an active original for the same administrator without reads', async () => {
    const f = fixture(); await f.controller.load();
    f.click('[data-admin-photo-original]', { adminPhotoOriginal: 'photo-1' }); await f.settle();
    f.setUser({ id: 'admin', app_metadata: { role: 'admin' } });
    assert.equal(f.controller.syncActor(), false);
    assert.equal(f.node('admin-photo-original-dialog').open, true);
    assert.equal(f.node('admin-photo-original-image').getAttribute('src'), signed);
    assert.equal(f.requests.length, 1);
    assert.equal(f.originals.length, 1);
});
