import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAdminOverview, formatVisibleDuration, createAdminOverviewController } from '../js/admin-overview.mjs';

test('overview distinguishes measured duration, account counts and external traffic', () => {
    const html = renderAdminOverview({ accounts: { total: 12, members: 10, new7d: 2, new30d: 3 }, photos: { total: 20, public: 4, new7d: 7, new30d: 9, owners: 3 }, dwell: { sample_count: 4, average_seconds: 92, total_seconds: 368, days: 30 }, daily: [{ date: '2026-10-31', registrations: 2, uploads: 3 }] });
    assert.match(html, /1분 32초/);
    assert.match(html, /가입 계정/);
    assert.match(html, /측정 완료 4건/);
    assert.match(html, /2026-10-31/);
    assert.doesNotMatch(html, /접속 중|정확한 사람|온라인/);
});

test('no samples are not presented as zero time and dynamic data is escaped', () => {
    const html = renderAdminOverview({ daily: [{ date: '<script>', registrations: -2, uploads: NaN }] });
    assert.match(html, /아직 집계가 없어요/);
    assert.doesNotMatch(html, /<script>|NaN|undefined/);
    assert.match(html, /&lt;script&gt;/);
    assert.equal(formatVisibleDuration(0), '0초');
    assert.equal(formatVisibleDuration(3600), '1시간');
});

test('overview discards responses after logout and never fetches for members', async () => {
    let user = { id: 'admin', app_metadata: { role: 'admin' } }, resolve, calls = 0;
    const node = { innerHTML: '', textContent: '', setAttribute() {}, removeAttribute() {} };
    const controller = createAdminOverviewController({ getUser: () => user, node: () => node, fetchOverview: () => { calls++; return new Promise(done => { resolve = done; }); } });
    const pending = controller.load(); user = null; controller.clear();
    resolve({ data: { accounts: { members: 22 } }, error: null }); await pending;
    assert.equal(node.innerHTML, '');
    user = { id: 'member', app_metadata: {} }; await controller.load();
    assert.equal(calls, 1);
});

test('initial loading keeps the metric/table geometry without presenting invented totals', () => {
    const html = renderAdminOverview({}, { loading: true });
    assert.match(html, /aria-hidden="true" class="admin-overview-placeholder"/);
    assert.equal((html.match(/<th scope="row">—<\/th>/g) || []).length, 7);
    assert.doesNotMatch(html, />0<|측정 완료 0건/);
});
test('daily photo counts open the corresponding KST date without exposing a loading action', () => {
    const html = renderAdminOverview({ daily: [{ date: '2026-10-31', registrations: 1, uploads: 4 }] });
    assert.match(html, /data-admin-photo-day="2026-10-31"[^>]*>4<\/button>/);
    assert.match(html, /사진 수를 누르면/);
    assert.doesNotMatch(renderAdminOverview({}, { loading: true }), /data-admin-photo-day/);
});

test('refresh retains settled data while pending and after a temporary failure', async () => {
    let resolve, calls = 0;
    const target = { innerHTML: '', setAttribute() {}, removeAttribute() {} }, status = { textContent: '' };
    const controller = createAdminOverviewController({ getUser: () => ({ id: 'admin', app_metadata: { role: 'admin' } }), node: () => target, statusNode: () => status,
        fetchOverview: () => ++calls === 1 ? Promise.resolve({ data: { accounts: { members: 8 } } }) : new Promise(done => { resolve = done; }) });
    await controller.load(); const settled = target.innerHTML;
    const pending = controller.load();
    assert.equal(target.innerHTML, settled);
    assert.match(status.textContent, /불러오는 중/);
    resolve({ data: null, error: new Error('offline') }); await pending;
    assert.equal(target.innerHTML, settled);
    assert.match(status.textContent, /못했어요/);
});
