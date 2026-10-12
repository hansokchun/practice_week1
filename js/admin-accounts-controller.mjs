import { ADMIN_ACTION_LABELS, getAdminModerationDraft, renderAdminAccountRows, renderAdminAccountDetail } from './admin-accounts.mjs';

export function createAdminAccountsController({ getUser, fetchAccounts, inspectAccount, moderateAccount, openModal, closeModals, showToast }) {
    let actorId = '', page = 1, accounts = [], total = 0, selected = null, loading = false, request = 0, detailRequest = 0, generation = 0, saving = false, requestId = '', operation = '';
    const node = id => document.getElementById(id);
    const allowed = () => getUser()?.app_metadata?.role === 'admin';
    function clear() {
        actorId = ''; accounts = []; selected = null; total = 0; loading = false; request++; detailRequest++; generation++;
        for (const id of ['admin-account-list', 'admin-account-detail', 'admin-account-message', 'admin-account-summary']) if (node(id)) node(id).textContent = '';
        if (node('admin-account-detail')) node('admin-account-detail').hidden = true;
        if (node('admin-moderation-modal')?.classList.contains('is-open')) closeModals();
    }
    function render() {
        node('admin-account-list').innerHTML = loading && !accounts.length ? '<p class="admin-empty" role="status">계정을 불러오는 중입니다.</p>' : renderAdminAccountRows(accounts, selected?.account?.id);
        node('admin-account-summary').textContent = `전체 ${total}개 계정`;
        node('admin-account-page').textContent = `${page} / ${Math.max(1, Math.ceil(total / 25))}`;
        node('admin-account-previous').disabled = loading || page <= 1;
        node('admin-account-next').disabled = loading || page * 25 >= total;
    }
    async function load({ resetPage = false } = {}) {
        if (!allowed()) { clear(); return; }
        const userId = getUser().id;
        if (actorId !== userId) { clear(); actorId = userId; page = 1; }
        if (resetPage) page = 1;
        const token = ++request;
        loading = true; render(); node('admin-account-message').textContent = '';
        const { data, error } = await fetchAccounts({ page, search: node('admin-account-search').value.trim(), status: node('admin-account-status').value });
        if (token !== request || getUser()?.id !== userId || !allowed()) return;
        loading = false;
        if (error) { accounts = []; total = 0; node('admin-account-message').textContent = error.message; render(); return; }
        accounts = data.accounts || []; total = data.total || 0; render();
    }
    async function select(id) {
        if (!allowed()) { clear(); return; }
        const userId = getUser().id, token = ++detailRequest;
        selected = null;
        node('admin-account-detail').hidden = false;
        node('admin-account-detail').innerHTML = '<p class="admin-empty" role="status">계정 정보를 불러오는 중입니다.</p>';
        const { data, error } = await inspectAccount(id);
        if (token !== detailRequest || userId !== getUser()?.id || !allowed()) return;
        if (error) { node('admin-account-detail').textContent = error.message; return; }
        selected = data; node('admin-account-detail').innerHTML = renderAdminAccountDetail(data); render();
        if (window.matchMedia('(max-width: 1000px)').matches) node('admin-account-detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function startAction(action) {
        if (!selected || !allowed() || selected.account.role === 'admin' || selected.account.id === getUser().id) return;
        operation = action; requestId = crypto.randomUUID();
        node('admin-moderation-title').textContent = `${selected.account.nickname} · ${ADMIN_ACTION_LABELS[action]}`;
        node('admin-moderation-description').textContent = action === 'warning' ? '이 사유가 사용자 알림으로 전달됩니다.' : action === 'ban' ? '선택한 기간 동안 로그인과 계정 활동을 제한합니다. 사진은 삭제하지 않습니다.' : '이 계정의 로그인과 활동 제한을 해제합니다.';
        node('admin-moderation-reason').value = '';
        node('admin-moderation-duration-label').hidden = action !== 'ban';
        node('admin-moderation-error').textContent = '';
        node('admin-moderation-confirm').textContent = ADMIN_ACTION_LABELS[action];
        openModal('#admin-moderation-modal');
    }
    async function submit(event) {
        event.preventDefault();
        if (saving || !selected || !allowed()) return;
        const draft = getAdminModerationDraft({ operation, reason: node('admin-moderation-reason').value, durationHours: node('admin-moderation-duration').value });
        if (!draft) { node('admin-moderation-error').textContent = '사유를 5~500자로 입력해주세요.'; return; }
        const userId = selected.account.id, actor = getUser().id, epoch = generation;
        const label = ADMIN_ACTION_LABELS[operation];
        saving = true; node('admin-moderation-confirm').disabled = true;
        const { error } = await moderateAccount({ userId, ...draft, requestId });
        saving = false; node('admin-moderation-confirm').disabled = false;
        if (epoch !== generation) return;
        if (getUser()?.id !== actor || !allowed()) { clear(); return; }
        if (error) { node('admin-moderation-error').textContent = error.message; return; }
        closeModals(); showToast(`${label} 처리를 완료했습니다.`);
        await Promise.all([load(), select(userId)]);
    }
    function bind() {
        node('admin-account-search-form').addEventListener('submit', event => { event.preventDefault(); void load({ resetPage: true }); });
        node('admin-account-status').addEventListener('change', () => load({ resetPage: true }));
        node('admin-account-refresh').addEventListener('click', () => { void load(); if (selected) void select(selected.account.id); });
        node('admin-account-previous').addEventListener('click', () => { page = Math.max(1, page - 1); void load(); });
        node('admin-account-next').addEventListener('click', () => { page++; void load(); });
        node('admin-account-list').addEventListener('click', event => { const button = event.target.closest('[data-admin-account]'); if (button) void select(button.dataset.adminAccount); });
        node('admin-account-detail').addEventListener('click', event => {
            if (event.target.closest('[data-admin-close-detail]')) { detailRequest++; selected = null; node('admin-account-detail').hidden = true; node('admin-account-detail').textContent = ''; render(); }
            const action = event.target.closest('[data-admin-moderate]'); if (action) startAction(action.dataset.adminModerate);
        });
        node('admin-moderation-form').addEventListener('submit', submit);
    }
    return { bind, load, clear };
}
