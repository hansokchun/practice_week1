const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const count = value => Math.max(0, Math.round(Number.isFinite(Number(value)) ? Number(value) : 0));
const number = value => count(value).toLocaleString('ko-KR');

export function formatVisibleDuration(value) {
    const seconds = count(value), hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60), rest = seconds % 60;
    return [hours ? `${hours}시간` : '', minutes ? `${minutes}분` : '', rest || (!hours && !minutes) ? `${rest}초` : ''].filter(Boolean).join(' ');
}

export function renderAdminOverview({ accounts = {}, photos = {}, dwell = {}, daily = [] } = {}, { loading = false } = {}) {
    const display = loading ? () => '—' : number;
    const metrics = [
        ['가입 계정', display(accounts.members), [`전체 계정 ${display(accounts.total)}개`, '관리자 포함']],
        ['최근 7일 가입', display(accounts.new7d), [`최근 30일 ${display(accounts.new30d)}개`]],
        ['등록된 사진', display(photos.total), [`공개 ${display(photos.public)}장`, `등록 계정 ${display(photos.owners)}개`]],
        ['최근 7일 사진', display(photos.new7d), [`최근 30일 ${display(photos.new30d)}장`]]
    ];
    const samples = count(dwell.sample_count);
    const days = loading ? Array.from({ length: 7 }, () => ({ date: '—' })) : (Array.isArray(daily) ? daily : []).slice(-7);
    return `<div${loading ? ' aria-hidden="true" class="admin-overview-placeholder"' : ''}><dl class="admin-overview-metrics">${metrics.map(([label, value, notes]) => `<div><dt>${label}</dt><dd>${value}</dd><dd class="admin-overview-note">${notes.map(note => `<span>${note}</span>`).join(' · ')}</dd></div>`).join('')}</dl>
        <div class="admin-overview-duration"><div><h3>평균 공개 화면 체류</h3><strong>${loading ? '—' : samples ? formatVisibleDuration(dwell.average_seconds) : '아직 집계가 없어요'}</strong><p>${loading ? '자료를 불러오는 중입니다.' : samples ? `최근 30일 · 측정 완료 ${number(samples)}건` : '운영 사이트에서 측정이 시작되면 표시됩니다.'}</p></div><p>화면이 보인 시간만 합산합니다. 비공개 화면·숨겨진 탭은 제외합니다. 종료가 확인된 방문만 집계합니다. <span class="admin-overview-phrase">방문당 최대 60분을 측정합니다.</span></p></div>
        <div class="admin-overview-trend"><h3>최근 7일 가입·사진 등록</h3><p>한국 시간 기준 · 신규 가입은 익명 계정 제외<br>사진 수를 누르면 그날 등록된 사진을 볼 수 있어요.</p><table><caption class="sr-only">날짜별 신규 가입과 사진 등록 수</caption><thead><tr><th scope="col">날짜</th><th scope="col">가입</th><th scope="col">사진</th></tr></thead><tbody>${days.map(day => `<tr><th scope="row">${escape(day.date)}</th><td>${display(day.registrations)}</td><td>${!loading && /^\d{4}-\d{2}-\d{2}$/.test(day.date) ? `<button class="admin-day-photos" type="button" data-admin-photo-day="${escape(day.date)}" aria-label="${escape(day.date)} 등록 사진 ${display(day.uploads)}장 보기">${display(day.uploads)}</button>` : display(day.uploads)}</td></tr>`).join('') || '<tr><td colspan="3">아직 집계가 없어요.</td></tr>'}</tbody></table></div></div>`;
}

export function createAdminOverviewController({ getUser, fetchOverview, node = () => document.getElementById('admin-site-overview-content'), statusNode = () => null }) {
    let request = 0, actorId = '', hasValue = false;
    const allowed = () => getUser()?.app_metadata?.role === 'admin';
    const status = value => { const target = statusNode(); if (target) target.textContent = value; };
    function clear() { request++; actorId = ''; hasValue = false; const target = node(); if (target) { target.innerHTML = ''; target.removeAttribute('aria-busy'); } status('가입과 사진 활동을 한눈에 확인하세요.'); }
    async function load() {
        if (!allowed()) { clear(); return; }
        const target = node(); if (!target) return;
        const actor = getUser().id;
        if (actorId !== actor) { clear(); actorId = actor; }
        const token = ++request;
        target.setAttribute('aria-busy', 'true');
        status('이용 현황을 불러오는 중입니다.');
        if (!hasValue) target.innerHTML = renderAdminOverview({}, { loading: true });
        try {
            const { data, error } = await fetchOverview();
            if (token !== request || actor !== getUser()?.id || !allowed()) return;
            target.removeAttribute('aria-busy');
            if (error || !data) {
                status('새로고침하지 못했어요. 다시 확인해주세요.');
                if (!hasValue) target.innerHTML = '<p class="admin-empty" role="alert">이용 현황을 불러오지 못했어요. 새로고침으로 다시 확인해주세요.</p>';
                return;
            }
            hasValue = true; target.innerHTML = renderAdminOverview(data);
            status('가입과 사진 활동을 한눈에 확인하세요.');
        } catch {
            if (token !== request || actor !== getUser()?.id || !allowed()) return;
            target.removeAttribute('aria-busy');
            status('새로고침하지 못했어요. 다시 확인해주세요.');
            if (!hasValue) target.innerHTML = '<p class="admin-empty" role="alert">이용 현황을 불러오지 못했어요. 새로고침으로 다시 확인해주세요.</p>';
        }
    }
    return { load, clear };
}
