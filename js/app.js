import {
    attachPhotosToAlbum,
    createAlbum,
    fetchAlbums,
    fetchPhotos,
    getCurrentUser,
    signInWithEmail,
    signOut,
    signUpWithEmail,
    uploadImage,
    updateAlbumVisibility,
    upsertPhoto
} from '../auth.js';
import { APP_SECTIONS, normalizeAppSection, parseSectionHash } from './app-sections.mjs';

const publicTrips = [
    { title: '도쿄 도심의 밤', meta: '18 photos · 7 places', lat: 35.6762, lng: 139.6503 },
    { title: '부산 광안리 밤바다', meta: '12 photos · 4 places', lat: 35.1532, lng: 129.1186 },
    { title: '교토의 고요한 아침', meta: '21 photos · 8 places', lat: 35.0116, lng: 135.7681 }
];

const state = {
    currentUser: null,
    stagedPhotos: [],
    savedPhotos: [],
    savedAlbums: [],
    lastSavedPhotoIds: [],
    albumDrafts: [],
    visibility: 'private',
    profileTab: 'map',
    exploreZoom: 7,
    isPersistingUpload: false
};

const ROUTES = new Set(['home', 'myphoto', 'explore', 'upload', 'album', 'review', 'share', 'trip', 'profile']);

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

function routeTo(section, { replace = false } = {}) {
    const normalized = ROUTES.has(section) ? section : normalizeAppSection(section);
    const hash = normalized === 'home' ? '#/' : `#/${normalized}`;
    if (replace) window.history.replaceState(null, '', hash);
    else if (window.location.hash !== hash) window.location.hash = hash;
    renderRoute(normalized);
}

function renderRoute(section) {
    const normalized = ROUTES.has(section) ? section : normalizeAppSection(section);
    const navSection = ['upload', 'album', 'review', 'share'].includes(normalized)
        ? APP_SECTIONS.MYPHOTO
        : normalized === 'trip' || normalized === 'profile'
            ? APP_SECTIONS.EXPLORE
            : normalized;
    document.body.dataset.page = normalized;
    $$('.page').forEach((page) => page.classList.remove('active'));
    const activePage = $(`#page-${normalized}`);
    if (activePage) activePage.classList.add('active');
    $$('[data-route]').forEach((link) => {
        link.classList.toggle('active', link.dataset.route === navSection);
    });
    $$('[data-mobile-route]').forEach((button) => {
        button.classList.toggle('active', button.dataset.mobileRoute === navSection);
    });
    if (normalized === APP_SECTIONS.EXPLORE) syncExploreGoogleMap();
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

function openModal(id) {
    const modal = $(id);
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
}

function closeModals() {
    $$('.modal').forEach((modal) => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
    });
}

function openPhotoDetail() {
    openModal('#photo-detail-modal');
}

function updateAccountUI() {
    const label = $('#account-label');
    const button = $('#btn-open-auth');
    const name = state.currentUser?.user_metadata?.nickname
        || state.currentUser?.email?.split('@')[0]
        || 'Guest';
    if (label) label.textContent = name;
    if (button) button.textContent = state.currentUser ? 'Logout' : 'Login';
}

async function loadSavedPhotos() {
    const { data, error } = await fetchPhotos();
    if (error) {
        showToast('저장된 사진을 불러오지 못했습니다.');
        state.savedPhotos = [];
        return;
    }
    state.savedPhotos = (data || [])
        .filter((photo) => !state.currentUser || photo.owner_id === state.currentUser.id || photo.shared)
        .map(normalizeSavedPhoto);
    renderSavedPhotoSurfaces();
}

async function loadSavedAlbums() {
    const { data, error } = await fetchAlbums();
    if (error) {
        state.savedAlbums = [];
        return;
    }
    state.savedAlbums = (data || [])
        .filter((album) => !state.currentUser || album.owner_id === state.currentUser.id || ['public', 'link'].includes(album.visibility))
        .map(normalizeSavedAlbum);
    renderSavedPhotoSurfaces();
}

function normalizeSavedAlbum(album) {
    return {
        id: album.id,
        title: album.title,
        note: album.note || '',
        visibility: album.visibility || 'private',
        cover_url: album.cover_url,
        owner_id: album.owner_id,
        photo_count: Number(album.photo_count || 0),
        created_at: album.created_at
    };
}

function normalizeSavedPhoto(photo) {
    return {
        id: photo.id,
        name: photo.title || photo.description || 'Travel photo',
        url: photo.url,
        date: photo.date || photo.created_at || new Date().toISOString(),
        lat: Number.isFinite(Number(photo.lat)) ? Number(photo.lat) : null,
        lng: Number.isFinite(Number(photo.lng)) ? Number(photo.lng) : null,
        shared: !!photo.shared,
        owner_id: photo.owner_id,
        album: photo.album || '나의 여행'
    };
}

function getMySavedPhotos() {
    if (!state.currentUser) return [];
    return state.savedPhotos.filter((photo) => photo.owner_id === state.currentUser.id);
}

function renderSavedPhotoSurfaces() {
    const myPhotos = getMySavedPhotos();
    const source = myPhotos.length ? myPhotos : [];
    const located = source.filter((photo) => photo.lat !== null && photo.lng !== null).length;
    const albums = new Set(source.map((photo) => photo.album).filter(Boolean));
    const savedAlbums = state.currentUser
        ? state.savedAlbums.filter((album) => album.owner_id === state.currentUser.id)
        : [];
    const statPhoto = $('#stat-photo-count');
    const statLocated = $('#stat-located-count');
    const statMissing = $('#stat-missing-count');
    const statAlbum = $('#stat-album-count');
    const recentGrid = $('#recent-photo-grid');

    if (statPhoto) statPhoto.textContent = source.length ? String(source.length) : '48';
    if (statLocated) statLocated.textContent = source.length ? String(located) : '36';
    if (statMissing) statMissing.textContent = source.length ? String(source.length - located) : '12';
    if (statAlbum) statAlbum.textContent = savedAlbums.length || source.length ? String(Math.max(savedAlbums.length, albums.size, 1)) : '5';

    if (recentGrid && source.length) {
        recentGrid.innerHTML = source.slice(0, 8).map((photo) => `
            <article>
                <img src="${photo.url}" alt="${escapeHtml(photo.name)}">
                <span class="material-symbols-outlined">${photo.shared ? 'public' : 'lock'}</span>
            </article>
        `).join('');
    }

    if (savedAlbums.length && !state.albumDrafts.length) renderSavedAlbumRows(savedAlbums);
    else if (source.length && !state.albumDrafts.length) renderSavedPhotoAlbums(source);
}

function renderSavedAlbumRows(albums) {
    const list = $('#album-list');
    const summary = $('#myphoto-summary');
    if (!list) return;
    if (summary) summary.textContent = `${albums.reduce((sum, album) => sum + album.photo_count, 0)} photos · ${albums.length} albums`;
    list.innerHTML = albums.map((album) => `
        <article class="album-row">
            <img src="${album.cover_url || 'images/main_bg2.jpg'}" alt="${escapeHtml(album.title)}">
            <div>
                <span class="status-line"><span class="material-symbols-outlined">${album.visibility === 'public' ? 'public' : 'lock'}</span> ${album.visibility === 'public' ? '공개' : album.visibility === 'link' ? '링크 공유' : '비공개'} · Supabase</span>
                <strong>${escapeHtml(album.title)}</strong>
                <p>${escapeHtml(album.note || '저장된 여행 앨범입니다.')}</p>
                <small>${album.photo_count} Photos · Album record</small>
            </div>
        </article>
    `).join('');
}

function renderSavedPhotoAlbums(photos) {
    const list = $('#album-list');
    const summary = $('#myphoto-summary');
    if (!list) return;
    const grouped = photos.reduce((acc, photo) => {
        const key = photo.album || '나의 여행';
        acc[key] ||= [];
        acc[key].push(photo);
        return acc;
    }, {});
    const albums = Object.entries(grouped);
    if (summary) summary.textContent = `${photos.length} photos · ${albums.length} albums`;
    list.innerHTML = albums.map(([name, albumPhotos]) => {
        const cover = albumPhotos[0];
        const shared = albumPhotos.some((photo) => photo.shared);
        return `
            <article class="album-row">
                <img src="${cover.url}" alt="${escapeHtml(name)}">
                <div>
                    <span class="status-line"><span class="material-symbols-outlined">${shared ? 'public' : 'lock'}</span> ${shared ? '공개' : '비공개'} · 저장됨</span>
                    <strong>${escapeHtml(name)}</strong>
                    <p>저장된 사진을 기준으로 구성된 여행 앨범입니다.</p>
                    <small>${albumPhotos.length} Photos · Supabase</small>
                </div>
            </article>
        `;
    }).join('');
}

function renderStagedPhotos() {
    const grid = $('#staged-photos');
    const countLabel = $('#album-count-label');
    const summary = $('#myphoto-summary');
    const resultPanel = $('#upload-result-panel');
    const totalCount = $('#upload-total-count');
    const successCount = $('#upload-success-count');
    if (!grid) return;

    if (countLabel) countLabel.textContent = `${state.stagedPhotos.length} photos`;
    if (summary) summary.textContent = `${state.stagedPhotos.length} photos · ${state.albumDrafts.length} albums`;
    if (totalCount) totalCount.textContent = `${state.stagedPhotos.length}장`;
    if (successCount) successCount.textContent = `${state.stagedPhotos.length}장`;
    if (resultPanel) resultPanel.classList.toggle('is-visible', state.stagedPhotos.length > 0);
    renderTravelDraftSurfaces();

    if (!state.stagedPhotos.length) {
        grid.className = 'photo-grid empty';
        grid.innerHTML = `
            <div class="empty-state">
                <strong>아직 선택한 사진이 없습니다.</strong>
                <span>사진 올리기를 누르면 이곳에서 업로드 초안을 확인합니다.</span>
            </div>
        `;
        return;
    }

    grid.className = 'photo-grid';
    grid.innerHTML = state.stagedPhotos.map((photo) => `
        <article class="photo-card">
            <img src="${photo.url}" alt="${photo.name}">
            <span>${photo.name}</span>
        </article>
    `).join('');
}

function getDraftPhotos() {
    if (state.stagedPhotos.length) return state.stagedPhotos;
    return [
        { name: 'Cover', url: 'images/main_bg1.jpg' },
        { name: 'Route', url: 'images/main_bg2.jpg' },
        { name: 'Public', url: 'images/main_bg3.jpg' },
        { name: 'Private', url: 'images/main_bg4.jpg' }
    ];
}

function renderTravelDraftSurfaces() {
    const draftPhotos = getDraftPhotos();
    const photoCount = state.stagedPhotos.length || 128;
    const publicCount = Math.max(0, photoCount - (state.stagedPhotos.length ? Math.min(2, state.stagedPhotos.length) : 4));
    const analysisCount = $('#analysis-photo-count');
    const reviewCount = $('#review-day-one-count');
    const shareTripCount = $('#share-trip-photo-count');
    const sharePreviewCount = $('#share-preview-count');
    const analysisStrip = $('#analysis-selected-strip');
    const shareGrid = $('#share-photo-grid');

    if (analysisCount) analysisCount.textContent = String(photoCount);
    if (reviewCount) reviewCount.textContent = `${Math.min(photoCount, 18)} photos · 5 places`;
    if (shareTripCount) shareTripCount.textContent = `${photoCount} photos`;
    if (sharePreviewCount) sharePreviewCount.textContent = `공개 사진 ${publicCount}장`;

    if (analysisStrip) {
        analysisStrip.innerHTML = draftPhotos.slice(0, 4).map((photo, index) => `
            <article>
                <img src="${photo.url}" alt="${escapeHtml(photo.name)}">
                <span>${index === 0 ? 'Cover' : index === 1 ? 'Route' : 'Photo'}</span>
            </article>
        `).join('');
    }

    if (shareGrid) {
        shareGrid.innerHTML = draftPhotos.slice(0, 6).map((photo, index) => `
            <article>
                <img src="${photo.url}" alt="${escapeHtml(photo.name)}">
                <span class="material-symbols-outlined${index === 3 ? ' muted' : ''}">${index === 3 ? 'radio_button_unchecked' : 'check_circle'}</span>
            </article>
        `).join('');
    }

    ['#review-pin-one', '#review-pin-two', '#review-pin-three'].forEach((selector, index) => {
        const image = $(selector);
        if (image && draftPhotos[index]) {
            image.src = draftPhotos[index].url;
            image.alt = draftPhotos[index].name;
        }
    });
}

function setVisibilityMode(mode) {
    state.visibility = ['private', 'link', 'public'].includes(mode) ? mode : 'private';
    $$('[data-visibility]').forEach((button) => {
        button.classList.toggle('active', button.dataset.visibility === state.visibility);
    });
    const status = $('.trip-meta [data-visibility-status]');
    if (status) {
        const label = state.visibility === 'public' ? '공개' : state.visibility === 'link' ? '링크 공유' : '비공개';
        status.textContent = `현재 상태: ${label}`;
    }
}

async function saveShareSettings() {
    const latestOwnAlbum = state.currentUser
        ? state.savedAlbums.find((album) => album.owner_id === state.currentUser.id)
        : null;
    if (latestOwnAlbum) {
        const { data, error } = await updateAlbumVisibility(latestOwnAlbum.id, state.visibility);
        if (!error && data) {
            state.savedAlbums = state.savedAlbums.map((album) => (
                album.id === data.id ? normalizeSavedAlbum(data) : album
            ));
        }
    }
    const message = state.visibility === 'public'
        ? '공개 여행으로 전환했습니다.'
        : state.visibility === 'link'
            ? '공유 링크 설정을 준비했습니다.'
            : '비공개 상태로 저장했습니다.';
    showToast(message);
    if (state.visibility === 'public') routeTo('trip');
}

function setProfileTab(tab) {
    state.profileTab = tab === 'albums' ? 'albums' : 'map';
    $$('[data-profile-tab]').forEach((button) => {
        button.classList.toggle('active', button.dataset.profileTab === state.profileTab);
        button.setAttribute('aria-selected', String(button.dataset.profileTab === state.profileTab));
    });
    $$('[data-profile-panel]').forEach((panel) => {
        panel.classList.toggle('is-active', panel.dataset.profilePanel === state.profileTab);
    });
}

function renderAlbumDrafts() {
    const list = $('#album-list');
    const summary = $('#myphoto-summary');
    if (summary) summary.textContent = `${state.stagedPhotos.length} photos · ${state.albumDrafts.length} albums`;
    if (!list) return;

    if (!state.albumDrafts.length) {
        list.innerHTML = `
            <article class="album-row">
                <img src="images/main_bg2.jpg" alt="">
                <div>
                    <span class="status-line"><span class="material-symbols-outlined">lock</span> 비공개 · 2023.11.12 - 11.16</span>
                    <strong>도쿄 4박 5일</strong>
                    <p>Arashiyama bamboo groves and ancient temples as they turned to vibrant crimsons.</p>
                    <small>128 Photos · Archival Quality</small>
                </div>
            </article>
            <article class="album-row">
                <img src="images/main_bg5.jpg" alt="">
                <div>
                    <span class="status-line"><span class="material-symbols-outlined">lock</span> 비공개 · 2023.09.20 - 10.05</span>
                    <strong>이탈리아 신혼여행</strong>
                    <p>Navigating azure waters and white-washed alleys. A study in blue and light.</p>
                    <small>342 Photos · Archival Quality</small>
                </div>
            </article>
        `;
        return;
    }

    list.innerHTML = state.albumDrafts.map((album) => `
        <article class="album-row">
            <img src="images/main_bg4.jpg" alt="">
            <div>
                <span class="status-line"><span class="material-symbols-outlined">lock</span> 비공개 · 방금 생성</span>
                <strong>${escapeHtml(album.name)}</strong>
                <p>${escapeHtml(album.note || '비공개 앨범 초안입니다.')}</p>
                <small>${state.stagedPhotos.length} Photos · Draft</small>
            </div>
        </article>
    `).join('');
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function handlePhotoFiles(files) {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    state.stagedPhotos.forEach((photo) => URL.revokeObjectURL(photo.url));
    state.stagedPhotos = selected.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
        file
    }));
    renderStagedPhotos();
    renderTravelDraftSurfaces();
    routeTo('upload');
    closeModals();
    showToast(`${selected.length}장의 사진을 업로드 초안에 추가했습니다.`);
}

function safeFileName(value) {
    return String(value || 'photo')
        .normalize('NFKD')
        .replace(/[^\w.-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80) || 'photo';
}

async function persistStagedPhotos() {
    if (!state.stagedPhotos.length) {
        routeTo('album');
        return;
    }
    if (!state.currentUser) {
        openModal('#auth-modal');
        showToast('사진을 저장하려면 먼저 로그인해주세요.');
        return;
    }
    if (state.isPersistingUpload) return;
    state.isPersistingUpload = true;
    const status = $('#upload-storage-status');
    const reviewButton = $('#btn-review-upload');
    if (status) status.textContent = '사진을 Supabase Storage에 저장하는 중입니다...';
    if (reviewButton) reviewButton.disabled = true;

    try {
        const timestamp = Date.now();
        const saved = [];
        for (const [index, photo] of state.stagedPhotos.entries()) {
            const id = `${timestamp}-${index}`;
            const fileName = `${state.currentUser.id}/${id}-${safeFileName(photo.name)}`;
            const { url, error: uploadError } = await uploadImage(photo.file, fileName);
            if (uploadError) throw uploadError;
            const record = {
                id,
                url,
                date: new Date().toISOString(),
                title: photo.name,
                description: '',
                lat: null,
                lng: null,
                liked: 0,
                shared: false,
                owner_id: state.currentUser.id,
                album: $('#album-name-input')?.value.trim() || '업로드 초안'
            };
            const { error: dbError } = await upsertPhoto(record);
            if (dbError) throw dbError;
            saved.push(normalizeSavedPhoto(record));
        }
        state.lastSavedPhotoIds = saved.map((photo) => photo.id);
        state.savedPhotos = [...saved, ...state.savedPhotos.filter((photo) => photo.owner_id !== state.currentUser.id || !saved.some((next) => next.id === photo.id))];
        renderSavedPhotoSurfaces();
        if (status) status.textContent = `${saved.length}장의 사진을 저장했습니다. 다음 단계에서 앨범을 구성하세요.`;
        showToast(`${saved.length}장의 사진을 저장했습니다.`);
        routeTo('album');
    } catch (error) {
        if (status) status.textContent = error.message || '사진 저장에 실패했습니다.';
        showToast('사진 저장에 실패했습니다. 로컬 초안은 유지됩니다.');
    } finally {
        state.isPersistingUpload = false;
        if (reviewButton) reviewButton.disabled = false;
    }
}

async function saveAlbumDraft() {
    const nameInput = $('#album-name-input');
    const noteInput = $('#album-note-input');
    const name = nameInput?.value.trim();
    if (!name) {
        showToast('앨범 이름을 입력해주세요.');
        nameInput?.focus();
        return;
    }
    const localDraft = {
        name,
        note: noteInput?.value.trim() || ''
    };
    state.albumDrafts.unshift(localDraft);

    if (state.currentUser) {
        const draftPhotos = getDraftPhotos();
        const { data: album, error } = await createAlbum({
            owner_id: state.currentUser.id,
            title: name,
            note: localDraft.note,
            visibility: state.visibility,
            cover_url: draftPhotos[0]?.url || null,
            photo_count: state.lastSavedPhotoIds.length || state.stagedPhotos.length || getMySavedPhotos().length
        });
        if (error) {
            showToast('앨범 초안은 화면에 만들었지만 DB 저장은 실패했습니다.');
        } else if (album) {
            state.savedAlbums.unshift(normalizeSavedAlbum(album));
            if (state.lastSavedPhotoIds.length) await attachPhotosToAlbum(album.id, state.lastSavedPhotoIds);
        }
    }

    nameInput.value = '';
    if (noteInput) noteInput.value = '';
    renderAlbumDrafts();
    renderSavedPhotoSurfaces();
    showToast('앨범 초안을 만들었습니다.');
}

function renderExploreList() {
    const list = $('#explore-list');
    if (!list) return;
    list.innerHTML = publicTrips.map((trip) => `
        <article class="explore-item">
            <strong>${trip.title}</strong>
            <span>${trip.meta}</span>
        </article>
    `).join('');
}

function syncExploreGoogleMap() {
    const frame = $('#explore-google-map');
    if (!frame) return;
    const nextSrc = `https://www.google.com/maps?q=36.45,127.85&z=${state.exploreZoom}&output=embed`;
    if (frame.src !== nextSrc) frame.src = nextSrc;
}

function updateExploreZoom(direction) {
    const delta = direction === 'in' ? 1 : -1;
    state.exploreZoom = Math.min(12, Math.max(5, state.exploreZoom + delta));
    syncExploreGoogleMap();
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    const email = $('#email-input')?.value.trim();
    const password = $('#password-input')?.value;
    const message = $('#auth-message');
    if (!email || !password) return;
    if (message) message.textContent = '로그인 중입니다...';
    const { user, error } = await signInWithEmail(email, password);
    if (error) {
        if (message) message.textContent = error.message || '로그인에 실패했습니다.';
        return;
    }
    state.currentUser = user;
    updateAccountUI();
    await loadSavedPhotos();
    await loadSavedAlbums();
    closeModals();
    showToast('로그인했습니다.');
}

async function handleSignup() {
    const email = $('#email-input')?.value.trim();
    const password = $('#password-input')?.value;
    const message = $('#auth-message');
    if (!email || !password) return;
    if (message) message.textContent = '가입 중입니다...';
    const { user, error } = await signUpWithEmail(email, password);
    if (error) {
        if (message) message.textContent = error.message || '가입에 실패했습니다.';
        return;
    }
    state.currentUser = user;
    updateAccountUI();
    await loadSavedPhotos();
    await loadSavedAlbums();
    closeModals();
    showToast('가입을 완료했습니다.');
}

function bindEvents() {
    $$('[data-route]').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            routeTo(link.dataset.route);
        });
    });
    $$('[data-mobile-route]').forEach((button) => {
        button.addEventListener('click', () => routeTo(button.dataset.mobileRoute));
    });

    $('#btn-home-myphoto')?.addEventListener('click', () => routeTo(APP_SECTIONS.MYPHOTO));
    $('#btn-home-explore')?.addEventListener('click', () => routeTo(APP_SECTIONS.EXPLORE));
    $('#btn-open-upload')?.addEventListener('click', () => routeTo('upload'));
    $('#btn-open-album')?.addEventListener('click', () => routeTo('album'));
    $('#btn-open-album-inline')?.addEventListener('click', () => routeTo('album'));
    $('#btn-new-trip')?.addEventListener('click', () => routeTo('album'));
    $$('[data-go-myphoto]').forEach((button) => button.addEventListener('click', () => routeTo(APP_SECTIONS.MYPHOTO)));
    $$('[data-go-album]').forEach((button) => button.addEventListener('click', () => routeTo('album')));
    $$('[data-go-review]').forEach((button) => button.addEventListener('click', () => routeTo('review')));
    $$('[data-go-share]').forEach((button) => button.addEventListener('click', () => routeTo('share')));
    $$('[data-go-trip]').forEach((button) => button.addEventListener('click', () => routeTo('trip')));
    $$('[data-go-profile]').forEach((button) => button.addEventListener('click', () => routeTo('profile')));
    $$('[data-open-photo-detail]').forEach((button) => button.addEventListener('click', openPhotoDetail));
    $$('[data-explore-pin]').forEach((button) => button.addEventListener('click', () => {
        document.body.classList.add('explore-pin-selected');
        $('#explore-pin-preview')?.removeAttribute('hidden');
    }));
    $('#btn-close-pin-preview')?.addEventListener('click', () => {
        document.body.classList.remove('explore-pin-selected');
        $('#explore-pin-preview')?.setAttribute('hidden', '');
    });
    $$('[data-map-zoom]').forEach((button) => {
        button.addEventListener('click', () => updateExploreZoom(button.dataset.mapZoom));
    });
    $('[data-map-reset]')?.addEventListener('click', () => {
        state.exploreZoom = 7;
        syncExploreGoogleMap();
    });
    $('#btn-open-share-settings')?.addEventListener('click', () => routeTo('share'));
    $$('[data-visibility]').forEach((button) => {
        button.addEventListener('click', () => setVisibilityMode(button.dataset.visibility));
    });
    $$('[data-visibility-shortcut]').forEach((button) => {
        button.addEventListener('click', () => {
            setVisibilityMode(button.dataset.visibilityShortcut);
            if (button.dataset.visibilityShortcut === 'link') showToast('공유 링크 설정을 선택했습니다.');
        });
    });
    $('#btn-save-share-settings')?.addEventListener('click', saveShareSettings);
    $$('[data-profile-tab]').forEach((button) => {
        button.addEventListener('click', () => setProfileTab(button.dataset.profileTab));
    });
    $('#btn-review-upload')?.addEventListener('click', persistStagedPhotos);
    $('#btn-upload-retry')?.addEventListener('click', () => $('#photo-input')?.click());
    $('#btn-clear-staged')?.addEventListener('click', () => {
        state.stagedPhotos.forEach((photo) => URL.revokeObjectURL(photo.url));
        state.stagedPhotos = [];
        renderStagedPhotos();
        showToast('업로드 초안을 비웠습니다.');
    });
    $('#btn-save-album-draft')?.addEventListener('click', saveAlbumDraft);
    $('#photo-input')?.addEventListener('change', (event) => handlePhotoFiles(event.target.files));

    $('#btn-open-auth')?.addEventListener('click', async () => {
        if (state.currentUser) {
            await signOut();
            state.currentUser = null;
            state.savedPhotos = [];
            state.savedAlbums = [];
            state.lastSavedPhotoIds = [];
            updateAccountUI();
            renderSavedPhotoSurfaces();
            showToast('로그아웃했습니다.');
            return;
        }
        openModal('#auth-modal');
    });
    $('#auth-form')?.addEventListener('submit', handleAuthSubmit);
    $('#btn-signup')?.addEventListener('click', handleSignup);

    $$('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModals));
    $$('.modal').forEach((modal) => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeModals();
        });
    });

    window.addEventListener('hashchange', () => {
        renderRoute(parseRouteHash(window.location.hash));
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    state.currentUser = await getCurrentUser();
    updateAccountUI();
    await loadSavedPhotos();
    await loadSavedAlbums();
    bindEvents();
    renderStagedPhotos();
    renderAlbumDrafts();
    renderTravelDraftSurfaces();
    renderExploreList();
    setVisibilityMode(state.visibility);
    setProfileTab(state.profileTab);
    const initialSection = parseRouteHash(window.location.hash);
    routeTo(initialSection, { replace: !window.location.hash });
});

function parseRouteHash(hash) {
    if (!hash || !hash.startsWith('#/')) return APP_SECTIONS.HOME;
    const path = hash.slice(2).split('?')[0].replace(/^\/+|\/+$/g, '');
    if (!path) return APP_SECTIONS.HOME;
    if (ROUTES.has(path)) return path;
    return parseSectionHash(hash) || APP_SECTIONS.HOME;
}
