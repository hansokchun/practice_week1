const DAY = 86400000;
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const valid = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const format = value => value.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
const time = value => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '미확인';
// Reviewed 2026-11-03: https://supabase.com/pricing. Fixed Free reference, not a live plan lookup.
const METRICS = [
    { key: 'database_bytes', label: '데이터베이스', limit: 500e6, divisor: 1e6, unit: 'MB', note: '이 프로젝트 · 현재 DB 크기' },
    { key: 'storage_bytes', label: '사진·파일 저장', limit: 1e9, divisor: 1e6, unit: 'MB', note: '이 프로젝트 · 원본·썸네일 포함, 조직 합산 한도' },
    { key: 'egress_gb', label: '일반 전송량', limit: 5, unit: 'GB', note: '조직 전체 · Egress (캐시 제외)', monthly: true },
    { key: 'cached_egress_gb', label: '캐시 전송량', limit: 5, unit: 'GB', note: '조직 전체 · Cached Egress', monthly: true },
    { key: 'mau', label: '월간 활성 계정', limit: 50000, unit: '명', note: '조직 전체 · MAU, 방문자 수와 다름', monthly: true },
    { key: 'function_calls', label: '서버 함수 호출', limit: 500000, unit: '회', note: '조직 전체 · Edge Function Invocations', monthly: true }
];
const labels = { normal: '여유', warning: '주의', critical: '긴급', reached: '한도 도달', exceeded: '한도 초과', unknown: '확인 필요' };
export function quotaState(used, limit) {
    if (!valid(used) || !valid(limit) || !limit) return 'unknown';
    const ratio = used / limit;
    return ratio > 1 ? 'exceeded' : ratio === 1 ? 'reached' : ratio >= .9 ? 'critical' : ratio >= .8 ? 'warning' : 'normal';
}

export function renderQuotaUsage(data = {}, now = Date.now()) {
    const snapshot = data.snapshot || {};
    const observed = Date.parse(snapshot.observed_at), measured = Date.parse(data.measured_at);
    const period = Date.parse(snapshot.period_start) <= now && now < Date.parse(snapshot.period_end);
    const monthlyAvailable = period && Number.isFinite(observed) && observed <= now + 60000;
    const liveAvailable = Number.isFinite(measured) && measured <= now + 60000;
    const cards = METRICS.map(metric => {
        const available = metric.monthly ? monthlyAvailable : liveAvailable;
        const used = available ? (metric.monthly ? snapshot[metric.key] : data[metric.key]) : null;
        const state = quotaState(used, metric.limit), stale = available && now - (metric.monthly ? observed : measured) > DAY;
        const percentage = valid(used) ? used / metric.limit * 100 : null;
        const divisor = metric.divisor || 1;
        return { state, stale, html: `<article class="admin-quota-card" data-quota-state="${state}"><div class="admin-quota-card-heading"><h3>${metric.label}</h3><span>${labels[state]}</span></div>
            <p class="admin-quota-value">${percentage === null ? '미확인' : `${format(used / divisor)} <small>/ ${format(metric.limit / divisor)} ${metric.unit}</small>`}</p>
            ${percentage === null ? '<p class="admin-quota-unmeasured">사용량을 확인해주세요</p>' : `<div class="admin-quota-meter"><meter min="0" max="${metric.limit}" value="${Math.min(used, metric.limit)}" aria-label="${metric.label} ${format(percentage)}% 사용"></meter><strong>${format(percentage)}%</strong></div>`}
            <p>${metric.note}</p><p>${metric.monthly ? '수동 확인' : '자동 측정'} · ${escape(time(metric.monthly ? snapshot.observed_at : data.measured_at))}${stale ? ' · 24시간 경과, 재확인 필요' : ''}${metric.monthly && !period && snapshot.period_end ? ' · 기간 만료 또는 확인 필요' : ''}</p></article>` };
    });
    const urgent = cards.filter(card => ['critical','reached','exceeded'].includes(card.state)).length;
    const warning = cards.filter(card => card.state === 'warning').length;
    const unknown = cards.filter(card => card.state === 'unknown' || card.stale).length;
    const alert = urgent ? `긴급 확인 ${urgent}개 · 한도 도달·초과 여부를 확인하고 사용량을 줄이거나 요금제를 검토하세요.`
        : warning ? `주의 ${warning}개 · 무료 한도의 80% 이상을 사용했어요.` : '측정 가능한 항목에서 80% 이상 사용은 확인되지 않았어요.';
    return `<p class="admin-quota-summary" data-quota-state="${urgent ? 'critical' : warning ? 'warning' : unknown ? 'unknown' : 'normal'}">${alert}${unknown ? ` 재확인 필요 ${unknown}개가 있어 전체 안전 여부는 판단할 수 없어요.` : ''}</p>
        <div class="admin-quota-grid">${cards.map(card => card.html).join('')}</div>
        <p class="admin-quota-note">${monthlyAvailable ? `수동 확인 기간: ${escape(snapshot.period_start)} ~ ${escape(snapshot.period_end)} (종료일 미포함, UTC). ` : ''}페이지 진입·새로고침 시 조회합니다. 메일·푸시 알림은 보내지 않습니다. 현재 크기는 과금 화면의 기간 평균과 다를 수 있어요. 다른 프로젝트가 있다면 저장 용량도 합산해야 합니다.</p>`;
}

export function createAdminQuotaController({ getUser, fetchUsage, saveSnapshot, root = () => document.getElementById('admin-quota') }) {
    let sequence = 0, actorId = '', dirty = false, saving = false, bound = false;
    const node = key => root()?.querySelector(`[data-quota-${key}]`);
    const allowed = () => getUser()?.app_metadata?.role === 'admin';
    const status = text => { if (node('status')) node('status').textContent = text; };
    function setSaving(value) {
        saving = value;
        for (const control of Array.from(node('form')?.elements || [])) control.disabled = value;
        if (node('save')) node('save').disabled = value;
    }
    function clear() {
        sequence++; actorId = ''; dirty = false; saving = false;
        if (node('content')) node('content').innerHTML = '';
        node('content')?.removeAttribute('aria-busy'); node('form')?.reset();
        setSaving(false);
        status('무료 한도 사용량을 확인하세요.');
    }
    async function load() {
        if (!allowed()) { clear(); return false; }
        if (!node('content')) return false;
        const actor = getUser().id;
        if (actorId !== actor) { clear(); actorId = actor; }
        const request = ++sequence;
        node('content').setAttribute('aria-busy', 'true'); status('무료 한도 사용량을 확인하고 있어요.');
        try {
            const { data, error } = await fetchUsage();
            if (request !== sequence || actor !== getUser()?.id || !allowed()) return false;
            if (error || !data) throw error || new Error('unavailable');
            node('content').innerHTML = renderQuotaUsage(data);
            if (!dirty) for (const field of ['period_start', 'period_end', 'egress_gb', 'cached_egress_gb', 'mau', 'function_calls']) {
                const input = node('form')?.elements?.namedItem(field);
                if (input) input.value = data.snapshot?.[field] ?? '';
            }
            status('80% 주의 · 90% 긴급 · 100% 한도 도달 · 미측정 항목은 별도 확인');
            return true;
        } catch {
            if (request !== sequence || actor !== getUser()?.id || !allowed()) return false;
            // Do not leave previously green meters looking current after a failed refresh.
            node('content').innerHTML = renderQuotaUsage({});
            status('조회 실패 · 현재 사용량을 확인할 수 없어요. Supabase 사용량 화면도 확인해주세요.');
            return false;
        } finally {
            if (request === sequence) node('content')?.removeAttribute('aria-busy');
        }
    }
    async function save(event) {
        event.preventDefault();
        if (!allowed() || saving) return;
        const form = node('form'); if (!form?.reportValidity()) return;
        const values = Object.fromEntries(new FormData(form));
        for (const key of ['egress_gb','cached_egress_gb','mau','function_calls']) values[key] = values[key]?.trim() ? Number(values[key]) : null;
        setSaving(true);
        const actor = getUser().id, request = ++sequence;
        status('확인한 월간 사용량을 저장하고 있어요.');
        try {
            const result = await saveSnapshot(values);
            if (request !== sequence || actor !== getUser()?.id || !allowed()) return;
            if (result?.error || !result?.data?.saved) throw new Error('save_failed');
            dirty = false;
            if (await load()) status('저장했어요. 수동 수치는 자동으로 증가하지 않으니 주기적으로 다시 확인해주세요.');
        } catch {
            if (request === sequence && actor === getUser()?.id && allowed()) status('저장하지 못했어요. 현재 사용 기간과 0 이상의 수치를 입력해주세요. 빈칸은 미확인으로 남습니다.');
        } finally {
            if (actor === getUser()?.id && allowed()) setSaving(false);
        }
    }
    function bind() {
        if (bound || !root()) return;
        bound = true;
        node('form')?.addEventListener('input', () => { dirty = true; });
        node('form')?.addEventListener('submit', event => { void save(event); });
        node('refresh')?.addEventListener('click', () => { if (!saving) void load(); });
    }
    return { bind, load, clear };
}
