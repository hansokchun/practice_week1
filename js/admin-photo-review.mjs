import { isAdminOriginalUrl, renderAdminPhotoReview, renderAdminPhotoOwner } from './admin-photo-review-view.mjs';
export { isAdminOriginalUrl, renderAdminPhotoReview } from './admin-photo-review-view.mjs';

function validDay(day) {
    if (!day) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    const date = new Date(`${day}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}
export function createAdminPhotoReviewController({ getUser, fetchPhotos, fetchOriginal, selectAccount }) {
    let actorId = '', page = 1, total = 0, photos = [], ownerId = '', ownerName = '', loading = false, request = 0, originalRequest = 0;
    const node = id => document.getElementById(id);
    const allowed = () => getUser()?.app_metadata?.role === 'admin';
    const status = message => { node('admin-photo-review-status').textContent = message; };
    function resetOriginal(close = true) {
        originalRequest++;
        const image = node('admin-photo-original-image'), link = node('admin-photo-original-link'), dialog = node('admin-photo-original-dialog');
        image.onload = null; image.onerror = null; image.hidden = true; image.alt = ''; image.removeAttribute('src');
        link.hidden = true; link.removeAttribute('href');
        node('admin-photo-original-title').textContent = '저장된 원본';
        node('admin-photo-original-status').textContent = '';
        if (close && dialog.open) dialog.close();
    }
    function controls() {
        node('admin-photo-review-previous').disabled = loading || page <= 1;
        node('admin-photo-review-next').disabled = loading || page * 12 >= total;
        node('admin-photo-review-page').textContent = total ? `${page} / ${Math.ceil(total / 12)}` : '—';
        node('admin-photo-review-owner').innerHTML = renderAdminPhotoOwner(ownerId, ownerName);
        node('admin-photo-review-owner').hidden = !ownerId;
    }
    function clear() {
        request++; actorId = ''; page = 1; total = 0; photos = []; ownerId = ''; ownerName = ''; loading = false;
        node('admin-photo-day').value = '';
        node('admin-photo-review-list').innerHTML = ''; node('admin-photo-review-list').removeAttribute('aria-busy');
        status(''); controls(); resetOriginal();
    }
    function syncActor() {
        if (!allowed() || (actorId && actorId !== getUser()?.id)) { clear(); return true; }
        return false;
    }
    async function load({ resetPage = false } = {}) {
        if (!allowed()) { clear(); return; }
        const actor = getUser().id;
        if (actorId !== actor) { clear(); actorId = actor; }
        if (resetPage) page = 1;
        const day = node('admin-photo-day').value;
        if (!validDay(day)) { status('올바른 날짜를 선택해주세요.'); return; }
        const token = ++request;
        loading = true; controls(); status('사진을 불러오는 중입니다.');
        node('admin-photo-review-list').setAttribute('aria-busy', 'true');
        if (!photos.length) node('admin-photo-review-list').innerHTML = '<p class="admin-empty">사진을 불러오는 중입니다.</p>';
        try {
            const { data, error } = await fetchPhotos({ page, ...(day ? { day } : {}), ...(ownerId ? { ownerId } : {}) });
            if (token !== request) return;
            if (actor !== getUser()?.id || !allowed()) { clear(); return; }
            loading = false; node('admin-photo-review-list').removeAttribute('aria-busy');
            if (error || !data) {
                photos = []; total = 0; node('admin-photo-review-list').innerHTML = '';
                status('사진을 불러오지 못했어요. 다시 조회해주세요.'); controls(); return;
            }
            photos = Array.isArray(data.photos) ? data.photos : [];
            total = Math.max(0, Number(data.total) || 0);
            node('admin-photo-review-list').innerHTML = renderAdminPhotoReview(photos);
            status(`${day ? `${day} · ` : ''}전체 ${total.toLocaleString('ko-KR')}장 · 최신 등록 순`); controls();
        } catch {
            if (token !== request) return;
            if (actor !== getUser()?.id || !allowed()) { clear(); return; }
            loading = false; photos = []; total = 0;
            node('admin-photo-review-list').removeAttribute('aria-busy'); node('admin-photo-review-list').innerHTML = '';
            status('사진을 불러오지 못했어요. 다시 조회해주세요.'); controls();
        }
    }
    function focusReview() { node('admin-photo-review').scrollIntoView({ block: 'start' }); }
    async function filterOwner(id, name = '') {
        if (!allowed()) { clear(); return; }
        if (actorId !== getUser().id) { clear(); actorId = getUser().id; }
        ownerId = id; ownerName = name; node('admin-photo-day').value = ''; photos = [];
        focusReview(); await load({ resetPage: true });
    }
    async function filterDay(day) {
        if (!allowed()) { clear(); return; }
        if (actorId !== getUser().id) { clear(); actorId = getUser().id; }
        ownerId = ''; ownerName = ''; node('admin-photo-day').value = day; photos = [];
        focusReview(); await load({ resetPage: true });
    }
    async function openOriginal(button) {
        if (!allowed()) { clear(); return; }
        syncActor(); actorId = getUser().id;
        resetOriginal();
        const actor = getUser().id, token = ++originalRequest, dialog = node('admin-photo-original-dialog');
        const title = button.dataset.adminPhotoTitle || '저장된 원본';
        node('admin-photo-original-title').textContent = title;
        node('admin-photo-original-status').textContent = '저장된 원본을 불러오는 중입니다.';
        if (!dialog.open) dialog.showModal();
        try {
            const { data, error } = await fetchOriginal(button.dataset.adminPhotoOriginal);
            if (token !== originalRequest) return;
            if (actor !== getUser()?.id || !allowed()) { clear(); return; }
            if (error || !isAdminOriginalUrl(data?.url)) {
                node('admin-photo-original-status').textContent = '원본을 불러오지 못했어요. 창을 닫고 다시 시도해주세요.'; return;
            }
            const image = node('admin-photo-original-image'), link = node('admin-photo-original-link');
            const current = () => token === originalRequest && actor === getUser()?.id && allowed();
            image.onload = () => { if (current()) node('admin-photo-original-status').textContent = ''; };
            image.onerror = () => { if (current()) { image.hidden = true; node('admin-photo-original-status').textContent = '미리보기를 표시하지 못했어요. 새 탭에서 파일을 확인해주세요.'; } };
            image.alt = `${title} 저장된 원본`; image.setAttribute('src', data.url); image.hidden = false;
            link.setAttribute('href', data.url); link.hidden = false;
        } catch {
            if (token !== originalRequest) return;
            if (actor !== getUser()?.id || !allowed()) { clear(); return; }
            node('admin-photo-original-status').textContent = '원본을 불러오지 못했어요. 창을 닫고 다시 시도해주세요.';
        }
    }
    function bind() {
        node('admin-photo-review-form').addEventListener('submit', event => { event.preventDefault(); photos = []; return load({ resetPage: true }); });
        node('admin-photo-filter-reset').addEventListener('click', () => { ownerId = ''; ownerName = ''; node('admin-photo-day').value = ''; photos = []; void load({ resetPage: true }); });
        node('admin-photo-review-previous').addEventListener('click', () => { if (!loading && page > 1) { page--; void load(); } });
        node('admin-photo-review-next').addEventListener('click', () => { if (!loading && page * 12 < total) { page++; void load(); } });
        node('page-admin-accounts').addEventListener('click', event => {
            const closest = selector => event.target.closest?.(selector);
            const original = closest('[data-admin-photo-original]'); if (original) void openOriginal(original);
            const account = closest('[data-admin-photo-account]'); if (account && allowed()) selectAccount(account.dataset.adminPhotoAccount);
            const owner = closest('[data-admin-photo-filter-owner]'); if (owner) void filterOwner(owner.dataset.adminPhotoFilterOwner, owner.dataset.adminPhotoOwnerName);
            const day = closest('[data-admin-photo-day]'); if (day) void filterDay(day.dataset.adminPhotoDay);
            if (closest('[data-admin-photo-clear-owner]')) { ownerId = ''; ownerName = ''; photos = []; void load({ resetPage: true }); }
        });
        node('admin-photo-original-close').addEventListener('click', () => resetOriginal());
        node('admin-photo-original-dialog').addEventListener('close', () => resetOriginal(false));
        node('admin-photo-original-dialog').addEventListener('cancel', () => resetOriginal(false));
    }
    return { bind, load, clear, filterOwner, syncActor };
}
