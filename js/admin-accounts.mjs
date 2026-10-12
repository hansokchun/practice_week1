const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const providers = values => (Array.isArray(values) ? values : []).map(value => ({ email: '이메일', google: 'Google', kakao: 'Kakao' }[value] || value)).join(' · ') || '--';
export const ADMIN_ACTION_LABELS = { warning: '경고', ban: '차단', unban: '차단 해제' };
export function formatAdminDate(value) {
    const date = new Date(value || '');
    return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(date) : '--';
}
export const isAdminAccountBanned = account => new Date(account?.banned_until || 0).getTime() > Date.now();
export function getAdminModerationDraft({ operation, reason = '', durationHours } = {}) {
    const text = String(reason).trim(), hours = Number(durationHours);
    if (!Object.hasOwn(ADMIN_ACTION_LABELS, operation) || text.length < 5 || text.length > 500
        || (operation === 'ban' && ![24, 168, 720, 876000].includes(hours))) return null;
    return { operation, reason: text, durationHours: operation === 'ban' ? hours : null };
}
export function renderAdminAccountRows(accounts = [], selectedId = '') {
    if (!accounts.length) return '<p class="admin-empty">조건에 맞는 계정이 없습니다.</p>';
    return accounts.map(account => `<button class="admin-account-row ${account.id === selectedId ? 'is-selected' : ''}" data-admin-account="${escape(account.id)}" type="button" aria-pressed="${account.id === selectedId}">
        <span class="admin-account-identity"><strong>${escape(account.nickname || '이름 없음')}</strong><span>${escape(account.email || '이메일 없음')}</span></span>
        <span>${escape(providers(account.providers))}</span><time>${escape(formatAdminDate(account.last_sign_in_at))}</time>
        <span class="admin-account-photo-count">${Number(account.photo_count) || 0}</span>
        <span class="admin-status ${isAdminAccountBanned(account) ? 'is-banned' : ''}">${account.role === 'admin' ? '관리자' : isAdminAccountBanned(account) ? '차단' : '정상'}</span>
    </button>`).join('');
}
export function renderAdminAccountDetail({ account = {}, photos = [], history = [] } = {}) {
    const banned = isAdminAccountBanned(account);
    return `<div class="admin-detail-heading"><div><h2>${escape(account.nickname || '이름 없음')}</h2><p>${escape(account.email || '이메일 없음')}</p></div><button data-admin-close-detail type="button" aria-label="계정 상세 닫기"><span class="material-symbols-outlined" aria-hidden="true">close</span></button></div>
        <dl class="admin-account-facts"><div><dt>계정 ID</dt><dd class="admin-account-id">${escape(account.id)}</dd></div><div><dt>가입일</dt><dd>${escape(formatAdminDate(account.created_at))}</dd></div><div><dt>최근 로그인</dt><dd>${escape(formatAdminDate(account.last_sign_in_at))}</dd></div><div><dt>로그인 방식</dt><dd>${escape(providers(account.providers))}</dd></div><div><dt>이메일 인증</dt><dd>${account.email_confirmed ? '인증됨' : '미인증'}</dd></div><div><dt>상태</dt><dd>${account.role === 'admin' ? '관리자' : banned ? `차단 · ${escape(formatAdminDate(account.banned_until))}까지` : '정상'}</dd></div></dl>
        ${account.bio ? `<p class="admin-account-bio">${escape(account.bio)}</p>` : ''}
        <div class="admin-account-stats"><span>사진 <strong>${Number(account.photo_count) || 0}</strong></span><span>공개 <strong>${Number(account.public_count) || 0}</strong></span><span>앨범 <strong>${Number(account.album_count) || 0}</strong></span></div>
        <section class="admin-account-photos"><h3>최근 사진</h3><div class="admin-tiny-photos">${photos.map(photo => `<figure title="${escape(photo.title || '사진')} · ${photo.visibility === 'public' ? '공개' : '비공개'}">${photo.thumbnailUrl ? `<img src="${escape(photo.thumbnailUrl)}" alt="${escape(photo.title || '사진')}" width="48" height="48" loading="lazy" decoding="async">` : '<span class="material-symbols-outlined" aria-label="미리보기 없음">image</span>'}<figcaption class="sr-only">${photo.visibility === 'public' ? '공개' : '비공개'}</figcaption></figure>`).join('') || '<p class="admin-empty">등록된 사진이 없습니다.</p>'}</div></section>
        ${account.role !== 'admin' ? `<div class="admin-moderation-actions"><button class="btn-secondary" data-admin-moderate="warning" type="button"><span class="material-symbols-outlined" aria-hidden="true">warning</span>경고</button><button class="btn-secondary ${banned ? '' : 'is-destructive'}" data-admin-moderate="${banned ? 'unban' : 'ban'}" type="button"><span class="material-symbols-outlined" aria-hidden="true">${banned ? 'lock_open' : 'block'}</span>${banned ? '차단 해제' : '차단'}</button></div>` : ''}
        <section class="admin-moderation-history"><h3>처리 이력</h3>${history.map(item => `<article><div><strong>${escape(ADMIN_ACTION_LABELS[item.action] || item.action)}</strong><time>${escape(formatAdminDate(item.created_at))}</time><span>${item.state === 'completed' ? '완료' : item.state === 'pending' ? '처리 중' : '확인 필요'}</span></div><p>${escape(item.reason)}</p></article>`).join('') || '<p class="admin-empty">처리 이력이 없습니다.</p>'}</section>`;
}
