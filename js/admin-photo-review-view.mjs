import { getVisibilityLabel } from './visibility-label.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export function isAdminOriginalUrl(value) {
    try {
        const url = new URL(value);
        return url.origin === 'https://pqczcponriukilrtpbdl.supabase.co' && !url.username && !url.password && !url.hash
            && url.pathname.startsWith('/storage/v1/object/sign/photos/')
            && url.pathname.length > '/storage/v1/object/sign/photos/'.length && Boolean(url.searchParams.get('token'));
    } catch { return false; }
}
export function renderAdminPhotoReview(photos = []) {
    if (!photos.length) return '<p class="admin-empty">조건에 맞는 사진이 없습니다.</p>';
    return photos.map(photo => {
        const title = String(photo.title || '').trim() || '제목 없음';
        const owner = photo.ownerNickname || '이름 없음';
        const visibility = photo.visibility === 'link' ? '링크공개' : getVisibilityLabel(photo.visibility);
        const date = new Date(photo.created_at || '');
        const validDate = Number.isFinite(date.getTime());
        const uploadedDay = validDate ? new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul'
        }).format(date) : '';
        const uploadedTime = validDate ? new Intl.DateTimeFormat('ko-KR', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul'
        }).format(date) : '';
        const original = `data-admin-photo-original="${escape(photo.id)}" data-admin-photo-title="${escape(title)}"`;
        return `<article class="admin-review-photo">
            <button type="button" class="admin-review-photo-preview" ${original} aria-label="${escape(title)} 저장된 원본 보기">${isAdminOriginalUrl(photo.thumbnailUrl)
                ? `<img src="${escape(photo.thumbnailUrl)}" alt="${escape(title)}" width="320" height="240" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
                : '<span class="material-symbols-outlined" aria-hidden="true">image</span>'}</button>
            <div class="admin-review-photo-meta"><strong class="admin-review-photo-title">${escape(title)}</strong>
                <button type="button" class="admin-review-photo-owner" title="${escape(owner)}" data-admin-photo-account="${escape(photo.owner_id)}">${escape(owner)}</button>
                <span>${escape(visibility)}</span>${validDate ? `<time datetime="${date.toISOString()}"><span>${escape(uploadedDay)}</span><span>${escape(uploadedTime)}</span></time>` : '<span>등록일 확인 불가</span>'}
            </div><div class="admin-review-photo-actions"><button class="btn-secondary" type="button" ${original}><span class="material-symbols-outlined" aria-hidden="true">open_in_full</span>원본 보기</button></div>
        </article>`;
    }).join('');
}
export function renderAdminPhotoOwner(id, name) {
    return id ? `<span>${escape(name || '선택한 계정')}의 사진</span><button type="button" data-admin-photo-clear-owner aria-label="계정 필터 해제"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>` : '';
}
