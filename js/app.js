import {
    getCurrentUser,
    signInWithEmail,
    signOut,
    signUpWithEmail
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
    albumDrafts: [],
    map: null,
    markers: []
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
    if (normalized === APP_SECTIONS.EXPLORE) initExploreMap();
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
        url: URL.createObjectURL(file)
    }));
    renderStagedPhotos();
    routeTo('upload');
    closeModals();
    showToast(`${selected.length}장의 사진을 업로드 초안에 추가했습니다.`);
}

function saveAlbumDraft() {
    const nameInput = $('#album-name-input');
    const noteInput = $('#album-note-input');
    const name = nameInput?.value.trim();
    if (!name) {
        showToast('앨범 이름을 입력해주세요.');
        nameInput?.focus();
        return;
    }
    state.albumDrafts.unshift({
        name,
        note: noteInput?.value.trim() || ''
    });
    nameInput.value = '';
    if (noteInput) noteInput.value = '';
    renderAlbumDrafts();
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

function initExploreMap() {
    const mapEl = $('#explore-map');
    if (!mapEl || typeof L === 'undefined') return;

    if (!state.map) {
        state.map = L.map(mapEl, {
            zoomControl: false,
            attributionControl: false
        }).setView([36.4, 127.8], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(state.map);
        L.control.zoom({ position: 'bottomright' }).addTo(state.map);

        state.markers = publicTrips.map((trip) => {
            const marker = L.circleMarker([trip.lat, trip.lng], {
                radius: 11,
                color: '#1a4d4e',
                weight: 3,
                fillColor: '#f48c71',
                fillOpacity: 0.86
            }).addTo(state.map);
            marker.bindPopup(`<strong>${trip.title}</strong><br>${trip.meta}`);
            return marker;
        });
    }

    window.setTimeout(() => state.map?.invalidateSize(), 80);
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
    $('#btn-open-share-settings')?.addEventListener('click', () => routeTo('share'));
    $('#btn-review-upload')?.addEventListener('click', () => routeTo('album'));
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
            updateAccountUI();
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
    bindEvents();
    renderStagedPhotos();
    renderAlbumDrafts();
    renderExploreList();
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
