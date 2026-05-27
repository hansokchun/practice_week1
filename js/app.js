import {
    attachPhotosToAlbum,
    createAlbum,
    fetchAlbums,
    fetchPhotos,
    getCurrentUser,
    signInWithEmail,
    signOut,
    signUpWithEmail,
    signInWithGoogle,
    signInWithKakao,
    updatePhotoLocation,
    updatePhotosVisibility,
    uploadImage,
    updateAlbumVisibility,
    upsertPhoto
} from '../auth.js';
import { APP_SECTIONS, normalizeAppSection, parseSectionHash } from './app-sections.mjs';
import {
    getLocationEditorPhoto,
    getMissingLocationPhotos,
    normalizeLocationDraft
} from './location-workflow.mjs';
import {
    restorePendingAuthContext,
    setPendingAuthAction,
    storePendingAuthContext,
    takePendingAuthAction
} from './pending-auth-action.mjs';
import { buildTripShareUrl, parseSharedAlbumId } from './share-link.mjs';

const state = {
    currentUser: null,
    stagedPhotos: [],
    savedPhotos: [],
    savedAlbums: [],
    lastSavedPhotoIds: [],
    albumDrafts: [],
    visibility: 'private',
    profileTab: 'map',
    selectedPublicAlbumId: null,
    selectedPhotoId: null,
    selectedLocationPhotoId: null,
    pendingAuthAction: null,
    exploreZoom: 7,
    isPersistingUpload: false
};

const getCurrentRoute = () => parseRouteHash(window.location.hash);

const ROUTES = new Set(['home', 'myphoto', 'explore', 'upload', 'album', 'review', 'share', 'trip', 'profile']);
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

function parseRouteHash(hash) {
    if (!hash || !hash.startsWith('#/')) return APP_SECTIONS.HOME;
    const path = hash.slice(2).split('?')[0].replace(/^\/+|\/+$/g, '');
    if (!path) return APP_SECTIONS.HOME;
    if (ROUTES.has(path)) return path;
    return parseSectionHash(hash) || APP_SECTIONS.HOME;
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
        : ['trip', 'profile'].includes(normalized)
            ? APP_SECTIONS.EXPLORE
            : normalized;

    document.body.dataset.page = normalized;
    $$('.page').forEach((page) => page.classList.remove('active'));
    $(`#page-${normalized}`)?.classList.add('active');
    $$('[data-route]').forEach((link) => link.classList.toggle('active', link.dataset.route === navSection));
    $$('[data-mobile-route]').forEach((button) => button.classList.toggle('active', button.dataset.mobileRoute === navSection));
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

function getAllDisplayPhotos() {
    return [
        ...state.savedPhotos,
        ...state.stagedPhotos.map((photo, index) => ({
            id: `staged-${index}`,
            name: photo.name,
            url: photo.url,
            date: new Date().toISOString(),
            album: '업로드 초안',
            visibility: 'private',
            shared: false
        }))
    ];
}

function getDefaultDetailPhoto() {
    const selectedAlbum = getSelectedPublicAlbum();
    return selectedAlbum.photos?.[0]
        || getAllDisplayPhotos()[0]
        || { id: 'demo-detail', name: '성산 앞바다의 오후', url: 'images/main_bg2.jpg', date: '2026-05-14', album: selectedAlbum.title, visibility: selectedAlbum.visibility };
}

function updatePhotoDetailModal(photo = getDefaultDetailPhoto()) {
    state.selectedPhotoId = photo.id || null;
    const modal = $('#photo-detail-modal');
    const image = modal?.querySelector('.photo-detail-card > img');
    const title = $('#photo-detail-title');
    const meta = modal?.querySelector('.photo-detail-card section > p:not(.eyebrow)');
    const albumValue = modal?.querySelector('dl div:nth-child(1) dd');
    const visibilityValue = modal?.querySelector('dl div:nth-child(2) dd');
    const originalValue = modal?.querySelector('dl div:nth-child(3) dd');
    const date = photo.date ? new Date(photo.date) : null;
    const dateLabel = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '날짜 미상';

    if (image) {
        image.src = photo.url || 'images/main_bg2.jpg';
        image.alt = photo.name || '여행 사진 상세';
    }
    if (title) title.textContent = photo.name || '여행 사진';
    if (meta) meta.textContent = `${dateLabel} · ${photo.lat && photo.lng ? `${photo.lat.toFixed(4)}, ${photo.lng.toFixed(4)}` : '위치 미지정'}`;
    if (albumValue) albumValue.textContent = photo.album || getSelectedPublicAlbum().title || '여행 앨범';
    if (visibilityValue) visibilityValue.textContent = photo.shared || photo.visibility === 'public' ? 'Public photo · approximate location' : 'Private photo';
    if (originalValue) originalValue.textContent = '공개 이미지에서는 EXIF 메타데이터를 보호합니다.';
}

function updateAccountUI() {
    const name = state.currentUser?.user_metadata?.nickname
        || state.currentUser?.email?.split('@')[0]
        || 'Guest';
    const label = $('#account-label');
    const button = $('#btn-open-auth');
    if (label) label.textContent = name;
    if (button) button.textContent = state.currentUser ? 'Logout' : 'Login';
}

function normalizeSavedPhoto(photo) {
    return {
        id: photo.id,
        name: photo.title || photo.description || 'Travel photo',
        url: photo.url,
        date: photo.date || photo.created_at || new Date().toISOString(),
        lat: Number.isFinite(Number(photo.lat)) ? Number(photo.lat) : null,
        lng: Number.isFinite(Number(photo.lng)) ? Number(photo.lng) : null,
        shared: !!photo.shared || photo.visibility === 'public',
        owner_id: photo.owner_id,
        album_id: photo.album_id || null,
        visibility: photo.visibility || (photo.shared ? 'public' : 'private'),
        album: photo.album || '나의 여행'
    };
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

function getMySavedPhotos() {
    if (!state.currentUser) return [];
    return state.savedPhotos.filter((photo) => photo.owner_id === state.currentUser.id);
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

function getFallbackPublicAlbums() {
    return [
        {
            id: 'demo-jeju',
            title: 'Jeju East Coast Drive',
            note: '성산에서 월정리까지 이어지는 바람 많은 해안 길. 공개할 사진만 골라 만든 여행 기록입니다.',
            visibility: 'public',
            cover_url: 'images/main_bg2.jpg',
            owner_id: 'demo',
            photo_count: 42,
            places: 11,
            lat: 33.4507,
            lng: 126.5707
        },
        {
            id: 'demo-tokyo',
            title: 'Tokyo Night Walk',
            note: '골목과 밤의 빛을 따라 만든 공개 여행 앨범입니다.',
            visibility: 'public',
            cover_url: 'images/main_bg3.jpg',
            owner_id: 'demo',
            photo_count: 18,
            places: 7,
            lat: 35.6762,
            lng: 139.6503
        },
        {
            id: 'demo-italy',
            title: 'Italian Blue Week',
            note: '푸른 바다와 오래된 골목을 따라 걸은 공개 여행 기록입니다.',
            visibility: 'public',
            cover_url: 'images/main_bg5.jpg',
            owner_id: 'demo',
            photo_count: 86,
            places: 14,
            lat: 41.9028,
            lng: 12.4964
        }
    ];
}

function getPublicAlbums() {
    const publicAlbums = state.savedAlbums
        .filter((album) => ['public', 'link'].includes(album.visibility))
        .map((album, index) => {
            const photos = state.savedPhotos.filter((photo) => {
                const publicPhoto = photo.shared || ['public', 'link'].includes(photo.visibility);
                const sameAlbum = photo.album_id === album.id || photo.album === album.title;
                return publicPhoto && sameAlbum;
            });
            const locatedPhotos = photos.filter((photo) => photo.lat !== null && photo.lng !== null);
            const lat = locatedPhotos.length
                ? locatedPhotos.reduce((sum, photo) => sum + photo.lat, 0) / locatedPhotos.length
                : 33.4507 + (index * 0.9);
            const lng = locatedPhotos.length
                ? locatedPhotos.reduce((sum, photo) => sum + photo.lng, 0) / locatedPhotos.length
                : 126.5707 + (index * 1.2);
            return {
                ...album,
                cover_url: album.cover_url || photos[0]?.url || getDraftPhotos()[index % getDraftPhotos().length]?.url || 'images/main_bg2.jpg',
                photo_count: Number(album.photo_count || photos.length || 1),
                places: Math.max(1, locatedPhotos.length || Math.ceil(Number(album.photo_count || photos.length || 1) / 4)),
                lat,
                lng,
                photos
            };
        });
    return publicAlbums.length ? publicAlbums : getFallbackPublicAlbums();
}

function getSelectedPublicAlbum() {
    const albums = getPublicAlbums();
    return albums.find((album) => album.id === state.selectedPublicAlbumId) || albums[0];
}

function setSelectedPublicAlbum(albumId) {
    state.selectedPublicAlbumId = albumId;
    renderPublicSurfaces();
}

function getCurrentShareUrl() {
    return buildTripShareUrl(window.location.origin, getSelectedPublicAlbum()?.id || state.selectedPublicAlbumId);
}

async function copyCurrentShareLink() {
    const url = getCurrentShareUrl();
    const output = $('#share-link-output');
    if (output) output.value = url;
    try {
        await navigator.clipboard?.writeText(url);
        showToast('공유 링크를 복사했습니다.');
    } catch {
        output?.select?.();
        showToast('공유 링크를 만들었습니다.');
    }
    return url;
}

function renderPublicSurfaces() {
    const albums = getPublicAlbums();
    const selected = getSelectedPublicAlbum();
    const cover = selected.cover_url || 'images/main_bg2.jpg';
    const note = selected.note || '공개할 사진만 골라 만든 여행 기록입니다.';
    const photoCount = Number(selected.photo_count || 0);
    const places = Number(selected.places || Math.max(1, Math.ceil(photoCount / 4)));
    const preview = $('#explore-pin-preview');
    const previewImage = preview?.querySelector('img');
    const previewTitle = preview?.querySelector('.pin-preview-copy h2');
    const previewNote = preview?.querySelector('.pin-preview-copy p:last-child');
    const previewMeta = preview?.querySelector('.pin-preview-meta');
    if (previewImage) {
        previewImage.src = cover;
        previewImage.alt = selected.title;
    }
    if (previewTitle) previewTitle.textContent = selected.title;
    if (previewNote) previewNote.textContent = note;
    if (previewMeta) {
        previewMeta.innerHTML = `
            <span><span class="material-symbols-outlined">photo_library</span> ${photoCount || 1} photos</span>
            <span><span class="material-symbols-outlined">place</span> ${places} places</span>
            <span><span class="material-symbols-outlined">public</span> ${selected.visibility === 'link' ? 'link' : 'public'}</span>
        `;
    }
    const shareOutput = $('#share-link-output');
    if (shareOutput) shareOutput.value = getCurrentShareUrl();

    const tripHeroImage = $('.public-trip-hero > img');
    const tripTitle = $('#trip-title');
    const tripCopy = $('.public-trip-copy > p:not(.eyebrow)');
    const routeMeta = $('.trip-route-card .compact-heading p');
    if (tripHeroImage) {
        tripHeroImage.src = cover;
        tripHeroImage.alt = selected.title;
    }
    if (tripTitle) tripTitle.textContent = selected.title;
    if (tripCopy) tripCopy.textContent = note;
    if (routeMeta) routeMeta.textContent = `공개 앨범 · ${places} places · ${photoCount || 1} public photos`;

    const routeStrip = $('.route-strip');
    if (routeStrip) {
        const routeLabels = selected.photos?.filter((photo) => photo.lat !== null && photo.lng !== null).slice(0, 4).map((photo) => photo.name)
            || ['Start', 'Walk', 'View', 'Finish'];
        const labels = routeLabels.length >= 2 ? routeLabels : [selected.title, 'Public map'];
        routeStrip.innerHTML = labels.slice(0, 4).map((label, index) => (
            `${index ? '<i></i>' : ''}<span>${escapeHtml(label)}</span>`
        )).join('');
    }

    const dayGrid = $('.trip-day-grid');
    if (dayGrid) {
        const tripPhotos = selected.photos?.length ? selected.photos : getDraftPhotos().map((photo, index) => ({
            ...photo,
            date: new Date(Date.now() + index * 86400000).toISOString()
        }));
        dayGrid.innerHTML = tripPhotos.slice(0, 3).map((photo, index) => `
            <article>
                <p class="eyebrow">Day ${index + 1}</p>
                <h3>${escapeHtml(photo.name || selected.title)}</h3>
                <p>${index === 0 ? '여행의 첫 장면을 공개 앨범의 시작점으로 정리했습니다.' : index === 1 ? '지도 위에서 이어지는 사진 흐름을 확인할 수 있습니다.' : '공개하기 좋은 장면만 골라 여행 기록으로 묶었습니다.'}</p>
            </article>
        `).join('');
    }

    const tripPhotoGrid = $('#public-trip-photo-grid');
    if (tripPhotoGrid) {
        const tripPhotos = selected.photos?.length ? selected.photos : getDraftPhotos();
        tripPhotoGrid.innerHTML = tripPhotos.slice(0, 8).map((photo, index) => `
            <article data-open-photo-detail data-photo-id="${escapeHtml(photo.id || `public-${index}`)}">
                <img src="${photo.url || cover}" alt="${escapeHtml(photo.name || selected.title)}">
                <span>${escapeHtml(photo.name || `Photo ${index + 1}`)}</span>
            </article>
        `).join('');
    }

    const mapFrame = $('#explore-google-map');
    if (mapFrame && Number.isFinite(Number(selected.lat)) && Number.isFinite(Number(selected.lng))) {
        const nextSrc = `https://www.google.com/maps?q=${selected.lat},${selected.lng}&z=${state.exploreZoom}&output=embed`;
        if (mapFrame.src !== nextSrc) mapFrame.src = nextSrc;
    }

    const mapTargets = [
        ...$$('[data-explore-pin].map-pin'),
        ...$$('[data-explore-pin].map-cluster'),
        ...$$('[data-explore-pin].map-dot')
    ];
    const positions = [
        { top: 45, left: 64 },
        { top: 32, left: 44 },
        { top: 61, left: 22 },
        { top: 22, left: 78 },
        { top: 74, left: 56 }
    ];
    mapTargets.forEach((target, index) => {
        const album = albums[index] || albums[index % albums.length];
        if (!album) return;
        const position = positions[index] || positions[0];
        target.dataset.publicAlbumId = album.id;
        target.setAttribute('aria-label', `${album.title} 공개 여행 보기`);
        target.style.top = `${position.top}%`;
        target.style.left = `${position.left}%`;
        target.classList.toggle('is-selected', album.id === selected.id);
        if (target.classList.contains('map-pin')) {
            const image = target.querySelector('img');
            const count = target.querySelector('b');
            if (image) {
                image.src = album.cover_url || 'images/main_bg2.jpg';
                image.alt = album.title;
            }
            if (count) count.textContent = String(Math.max(1, Number(album.photo_count || 1)));
        } else if (target.classList.contains('map-cluster')) {
            target.textContent = String(Math.max(1, Number(album.photo_count || 1)));
        }
    });

    const relatedGrid = $('.related-album-grid');
    if (relatedGrid) {
        relatedGrid.innerHTML = albums.slice(0, 3).map((album) => `
            <article data-public-album-id="${escapeHtml(album.id)}" data-go-trip>
                <img src="${album.cover_url || 'images/main_bg2.jpg'}" alt="">
                <strong>${escapeHtml(album.title)}</strong>
                <span>${album.photo_count || 1} photos · ${album.places || 1} places</span>
            </article>
        `).join('');
    }

    const profileStats = $('.profile-stats');
    if (profileStats) {
        const totalPhotos = albums.reduce((sum, album) => sum + Number(album.photo_count || 0), 0);
        const totalPlaces = albums.reduce((sum, album) => sum + Number(album.places || 1), 0);
        profileStats.innerHTML = `
            <span><strong>${albums.length}</strong> albums</span>
            <span><strong>${totalPhotos || albums.length}</strong> photos</span>
            <span><strong>${totalPlaces}</strong> places</span>
        `;
    }

    const profileGrid = $('.profile-album-grid');
    if (profileGrid) {
        profileGrid.innerHTML = albums.slice(0, 6).map((album) => `
            <article data-public-album-id="${escapeHtml(album.id)}" data-go-trip>
                <img src="${album.cover_url || 'images/main_bg2.jpg'}" alt="">
                <strong>${escapeHtml(album.title)}</strong>
                <span>${album.photo_count || 1} photos · ${album.places || 1} places</span>
            </article>
        `).join('');
    }

    const list = $('#explore-list');
    if (list) {
        list.innerHTML = albums.map((album) => `
            <article class="explore-item" data-public-album-id="${escapeHtml(album.id)}">
                <strong>${escapeHtml(album.title)}</strong>
                <span>${album.photo_count || 1} photos · ${album.places || 1} places</span>
            </article>
        `).join('');
    }

    $$('[data-public-album-id]').forEach((item) => {
        item.addEventListener('click', () => {
            setSelectedPublicAlbum(item.dataset.publicAlbumId);
            if (item.hasAttribute('data-go-trip')) routeTo('trip');
        });
    });
    $$('#public-trip-photo-grid [data-open-photo-detail]').forEach((item) => {
        item.addEventListener('click', () => {
            const photo = getAllDisplayPhotos().find((candidate) => candidate.id === item.dataset.photoId)
                || getSelectedPublicAlbum().photos?.find((candidate) => candidate.id === item.dataset.photoId)
                || getDefaultDetailPhoto();
            updatePhotoDetailModal(photo);
            openModal('#photo-detail-modal');
        });
    });
}

async function loadSavedPhotos() {
    const { data, error } = await fetchPhotos();
    if (error) {
        state.savedPhotos = [];
        showToast('저장된 사진을 불러오지 못했습니다.');
        return;
    }
    state.savedPhotos = (data || [])
        .filter((photo) => !state.currentUser || photo.owner_id === state.currentUser.id || photo.shared || photo.visibility === 'public')
        .map(normalizeSavedPhoto);
    renderSavedPhotoSurfaces();
    renderPublicSurfaces();
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
    renderPublicSurfaces();
}

function renderSavedPhotoSurfaces() {
    const myPhotos = getMySavedPhotos();
    const missingLocationPhotos = getMissingLocationPhotos(myPhotos);
    const located = myPhotos.length - missingLocationPhotos.length;
    const albumNames = new Set(myPhotos.map((photo) => photo.album).filter(Boolean));
    const savedAlbums = state.currentUser
        ? state.savedAlbums.filter((album) => album.owner_id === state.currentUser.id)
        : [];
    const recentGrid = $('#recent-photo-grid');

    $('#stat-photo-count') && ($('#stat-photo-count').textContent = myPhotos.length ? String(myPhotos.length) : '48');
    $('#stat-located-count') && ($('#stat-located-count').textContent = myPhotos.length ? String(located) : '36');
    $('#stat-missing-count') && ($('#stat-missing-count').textContent = myPhotos.length ? String(missingLocationPhotos.length) : '12');
    $('#stat-album-count') && ($('#stat-album-count').textContent = savedAlbums.length || myPhotos.length ? String(Math.max(savedAlbums.length, albumNames.size, 1)) : '5');
    renderMissingLocationTasks(missingLocationPhotos);

    if (recentGrid && myPhotos.length) {
        recentGrid.innerHTML = myPhotos.slice(0, 8).map((photo) => `
            <article>
                <img src="${photo.url}" alt="${escapeHtml(photo.name)}">
                <span class="material-symbols-outlined">${photo.shared ? 'public' : 'lock'}</span>
            </article>
        `).join('');
    }

    if (state.albumDrafts.length) {
        renderAlbumDrafts();
    } else if (savedAlbums.length) {
        renderSavedAlbumRows(savedAlbums);
    } else if (myPhotos.length) {
        renderSavedPhotoAlbums(myPhotos);
    } else {
        renderAlbumDrafts();
    }
}

function renderMissingLocationTasks(photos) {
    const list = $('#missing-location-list');
    if (!list) return;

    if (!photos.length) {
        list.innerHTML = `
            <p class="missing-location-empty">
                위치를 직접 지정해야 하는 사진이 없습니다.
            </p>
        `;
        return;
    }

    list.innerHTML = photos.slice(0, 4).map((photo) => `
        <button type="button" data-open-location-editor data-photo-id="${escapeHtml(photo.id)}">
            <img src="${photo.url}" alt="${escapeHtml(photo.name)}">
            <span>
                <strong>${escapeHtml(photo.name)}</strong>
                <small>위치 직접 지정</small>
            </span>
            <span class="material-symbols-outlined">edit_location_alt</span>
        </button>
    `).join('');
}

function renderSavedAlbumRows(albums) {
    const list = $('#album-list');
    const summary = $('#myphoto-summary');
    if (!list) return;
    if (summary) summary.textContent = `${albums.reduce((sum, album) => sum + album.photo_count, 0)} photos · ${albums.length} albums`;
    list.innerHTML = albums.map((album) => {
        const visibilityLabel = album.visibility === 'public' ? '공개' : album.visibility === 'link' ? '링크 공유' : '비공개';
        return `
            <article class="album-row">
                <img src="${album.cover_url || 'images/main_bg2.jpg'}" alt="${escapeHtml(album.title)}">
                <div>
                    <span class="status-line"><span class="material-symbols-outlined">${album.visibility === 'public' ? 'public' : 'lock'}</span> ${visibilityLabel} · Supabase</span>
                    <strong>${escapeHtml(album.title)}</strong>
                    <p>${escapeHtml(album.note || '저장된 여행 앨범입니다.')}</p>
                    <small>${album.photo_count} Photos · Album record</small>
                </div>
            </article>
        `;
    }).join('');
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
                    <p>저장된 사진을 기준으로 구성한 여행 앨범입니다.</p>
                    <small>${albumPhotos.length} Photos · Supabase</small>
                </div>
            </article>
        `;
    }).join('');
}

function renderStagedPhotos() {
    const grid = $('#staged-photos');
    if (!grid) return;
    $('#album-count-label') && ($('#album-count-label').textContent = `${state.stagedPhotos.length} photos`);
    $('#myphoto-summary') && ($('#myphoto-summary').textContent = `${state.stagedPhotos.length} photos · ${state.albumDrafts.length} albums`);
    $('#upload-total-count') && ($('#upload-total-count').textContent = `${state.stagedPhotos.length}장`);
    $('#upload-success-count') && ($('#upload-success-count').textContent = `${state.stagedPhotos.length}장`);
    $('#upload-result-panel')?.classList.toggle('is-visible', state.stagedPhotos.length > 0);
    renderTravelDraftSurfaces();

    if (!state.stagedPhotos.length) {
        grid.className = 'photo-grid empty';
        grid.innerHTML = `
            <div class="empty-state">
                <strong>아직 선택한 사진이 없습니다.</strong>
                <span>사진 올리기를 누르면 업로드 초안을 확인합니다.</span>
            </div>
        `;
        return;
    }

    grid.className = 'photo-grid';
    grid.innerHTML = state.stagedPhotos.map((photo) => `
        <article class="photo-card">
            <img src="${photo.url}" alt="${escapeHtml(photo.name)}">
            <span>${escapeHtml(photo.name)}</span>
        </article>
    `).join('');
}

function renderTravelDraftSurfaces() {
    const draftPhotos = getDraftPhotos();
    const photoCount = state.stagedPhotos.length || 128;
    const publicCount = Math.max(0, photoCount - (state.stagedPhotos.length ? Math.min(2, state.stagedPhotos.length) : 4));

    $('#analysis-photo-count') && ($('#analysis-photo-count').textContent = String(photoCount));
    $('#review-day-one-count') && ($('#review-day-one-count').textContent = `${Math.min(photoCount, 18)} photos · 5 places`);
    $('#share-trip-photo-count') && ($('#share-trip-photo-count').textContent = `${photoCount} photos`);
    $('#share-preview-count') && ($('#share-preview-count').textContent = `공개 사진 ${publicCount}장`);

    const analysisStrip = $('#analysis-selected-strip');
    if (analysisStrip) {
        analysisStrip.innerHTML = draftPhotos.slice(0, 4).map((photo, index) => `
            <article>
                <img src="${photo.url}" alt="${escapeHtml(photo.name)}">
                <span>${index === 0 ? 'Cover' : index === 1 ? 'Route' : 'Photo'}</span>
            </article>
        `).join('');
    }

    const shareGrid = $('#share-photo-grid');
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
    const status = $('[data-visibility-status]');
    if (status) {
        const label = state.visibility === 'public' ? '공개' : state.visibility === 'link' ? '링크 공유' : '비공개';
        status.textContent = `현재 상태: ${label}`;
    }
}

async function saveShareSettings() {
    if (!state.currentUser) {
        setPendingAuthAction(state, 'save-share');
        openModal('#auth-modal');
        showToast('공개 설정을 저장하려면 먼저 로그인해주세요.');
        return;
    }
    const latestOwnAlbum = await ensureAlbumForSharing();
    if (!latestOwnAlbum) return;
    let updatedAlbum = null;
    if (latestOwnAlbum) {
        const { data, error } = await updateAlbumVisibility(latestOwnAlbum.id, state.visibility);
        if (!error && data) {
            updatedAlbum = normalizeSavedAlbum(data);
            state.savedAlbums = state.savedAlbums.map((album) => (
                album.id === data.id ? updatedAlbum : album
            ));
        }
    }
    const photoIds = getSharePhotoIds();
    const { data: updatedPhotos } = await updatePhotosVisibility(photoIds, state.visibility);
    if (updatedPhotos?.length) {
        const normalized = updatedPhotos.map(normalizeSavedPhoto);
        state.savedPhotos = state.savedPhotos.map((photo) => normalized.find((next) => next.id === photo.id) || photo);
    }
    if (updatedAlbum) state.selectedPublicAlbumId = updatedAlbum.id;
    renderSavedPhotoSurfaces();
    renderPublicSurfaces();
    const message = state.visibility === 'public'
        ? '공개 여행으로 전환했습니다.'
        : state.visibility === 'link'
            ? '공유 링크 설정을 준비했습니다.'
            : '비공개 상태로 저장했습니다.';
    showToast(message);
    if (['public', 'link'].includes(state.visibility)) await copyCurrentShareLink();
    if (state.visibility === 'public') routeTo('trip');
}

function setProfileTab(tab) {
    state.profileTab = tab === 'albums' ? 'albums' : 'map';
    $$('[data-profile-tab]').forEach((button) => {
        const active = button.dataset.profileTab === state.profileTab;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
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
                    <span class="status-line"><span class="material-symbols-outlined">lock</span> 비공개 · 2026.05.12 - 05.16</span>
                    <strong>제주 4박 5일</strong>
                    <p>사진을 업로드하거나 앨범 초안을 저장하면 이곳에 실제 앨범이 표시됩니다.</p>
                    <small>128 Photos · Archival Quality</small>
                </div>
            </article>
            <article class="album-row">
                <img src="images/main_bg5.jpg" alt="">
                <div>
                    <span class="status-line"><span class="material-symbols-outlined">lock</span> 비공개 · 2026.04.20 - 04.22</span>
                    <strong>동해 새벽 여행</strong>
                    <p>공개 전까지는 Myphoto에서만 확인할 수 있는 개인 여행 기록입니다.</p>
                    <small>42 Photos · Archival Quality</small>
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
        setPendingAuthAction(state, 'persist-upload');
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
                album: $('#album-name-input')?.value.trim() || '업로드 초안',
                visibility: 'private',
                geo_source: 'unknown'
            };
            const { error: dbError } = await upsertPhoto(record);
            if (dbError) throw dbError;
            saved.push(normalizeSavedPhoto(record));
        }
        state.lastSavedPhotoIds = saved.map((photo) => photo.id);
        state.savedPhotos = [
            ...saved,
            ...state.savedPhotos.filter((photo) => photo.owner_id !== state.currentUser.id || !saved.some((next) => next.id === photo.id))
        ];
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
    const localDraft = { name, note: noteInput?.value.trim() || '' };
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
            showToast('앨범 초안은 화면에 만들었지만 DB 저장에 실패했습니다.');
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

function getSharePhotoIds() {
    return state.lastSavedPhotoIds.length
        ? state.lastSavedPhotoIds
        : getMySavedPhotos().map((photo) => photo.id);
}

function getDraftAlbumInput() {
    const name = $('#album-name-input')?.value.trim()
        || state.albumDrafts[0]?.name
        || '나의 여행 앨범';
    const note = $('#album-note-input')?.value.trim()
        || state.albumDrafts[0]?.note
        || '사진을 바탕으로 만든 여행 앨범입니다.';
    return { name, note };
}

async function ensureAlbumForSharing() {
    if (!state.currentUser) return null;
    const existingAlbum = state.savedAlbums.find((album) => album.owner_id === state.currentUser.id);
    if (existingAlbum) return existingAlbum;

    const { name, note } = getDraftAlbumInput();
    const photoIds = getSharePhotoIds();
    const draftPhotos = getDraftPhotos();
    const { data, error } = await createAlbum({
        owner_id: state.currentUser.id,
        title: name,
        note,
        visibility: state.visibility,
        cover_url: draftPhotos[0]?.url || null,
        photo_count: photoIds.length || state.stagedPhotos.length || getMySavedPhotos().length
    });
    if (error || !data) {
        showToast('공개 설정을 저장할 앨범을 만들지 못했습니다.');
        return null;
    }

    const album = normalizeSavedAlbum(data);
    state.savedAlbums.unshift(album);
    if (photoIds.length) await attachPhotosToAlbum(album.id, photoIds);
    return album;
}

function getEditablePhoto() {
    return getLocationEditorPhoto(getMySavedPhotos(), state.selectedLocationPhotoId || state.selectedPhotoId);
}

function renderLocationPhotoChoices(selectedPhotoId) {
    const list = $('#location-photo-list');
    if (!list) return;
    const missingPhotos = getMissingLocationPhotos(getMySavedPhotos());

    if (!missingPhotos.length) {
        list.innerHTML = '';
        return;
    }

    list.innerHTML = missingPhotos.slice(0, 6).map((photo) => `
        <button class="${photo.id === selectedPhotoId ? 'is-selected' : ''}" type="button" data-select-location-photo="${escapeHtml(photo.id)}">
            <img src="${photo.url}" alt="${escapeHtml(photo.name)}">
            <span>${escapeHtml(photo.name)}</span>
        </button>
    `).join('');
}

function setLocationEditorPhoto(photoId) {
    const photo = getLocationEditorPhoto(getMySavedPhotos(), photoId);
    const latInput = $('#location-lat-input');
    const lngInput = $('#location-lng-input');
    const message = $('#location-editor-message');
    const title = $('#location-selected-photo-title');
    const draft = normalizeLocationDraft(photo);

    state.selectedLocationPhotoId = photo?.id || null;
    if (latInput) latInput.value = draft.lat;
    if (lngInput) lngInput.value = draft.lng;
    if (title) title.textContent = photo ? photo.name : '저장된 사진 없음';
    if (message) {
        message.textContent = photo
            ? `${photo.name}의 위치를 직접 지정합니다.`
            : '저장된 사진이 없어서 화면 흐름만 확인할 수 있습니다.';
    }
    renderLocationPhotoChoices(state.selectedLocationPhotoId);
}

function openLocationEditor(eventOrPhotoId) {
    const photoId = typeof eventOrPhotoId === 'string'
        ? eventOrPhotoId
        : eventOrPhotoId?.currentTarget?.dataset?.photoId || state.selectedPhotoId;
    const photo = getLocationEditorPhoto(getMySavedPhotos(), photoId);
    const latInput = $('#location-lat-input');
    const lngInput = $('#location-lng-input');
    const message = $('#location-editor-message');
    if (latInput) latInput.value = photo?.lat ?? '33.450701';
    if (lngInput) lngInput.value = photo?.lng ?? '126.570667';
    if (message) {
        message.textContent = photo
            ? `${photo.name}의 위치를 수정합니다.`
            : '저장된 사진이 없으면 화면에서만 위치 지정 흐름을 확인할 수 있습니다.';
    }
    setLocationEditorPhoto(photo?.id || null);
    openModal('#location-editor-modal');
}

async function saveManualLocation(event) {
    event.preventDefault();
    const lat = Number($('#location-lat-input')?.value);
    const lng = Number($('#location-lng-input')?.value);
    const message = $('#location-editor-message');
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
        if (message) message.textContent = '올바른 위도와 경도를 입력해주세요.';
        return;
    }

    const photo = getEditablePhoto();
    if (!state.currentUser || !photo) {
        if (message) message.textContent = '로그인 후 저장된 사진부터 위치를 저장할 수 있습니다.';
        showToast('화면 흐름을 확인했습니다. 실제 저장은 로그인 후 가능합니다.');
        closeModals();
        return;
    }

    if (message) message.textContent = '위치를 저장하는 중입니다...';
    const { data, error } = await updatePhotoLocation(photo.id, lat, lng);
    if (error) {
        if (message) message.textContent = error.message || '위치 저장에 실패했습니다.';
        return;
    }
    const updated = normalizeSavedPhoto(data);
    state.savedPhotos = state.savedPhotos.map((savedPhoto) => savedPhoto.id === updated.id ? updated : savedPhoto);
    state.selectedLocationPhotoId = null;
    renderSavedPhotoSurfaces();
    renderTravelDraftSurfaces();
    renderPublicSurfaces();
    closeModals();
    showToast('사진 위치를 저장했습니다.');
}

function renderExploreList() {
    renderPublicSurfaces();
}

function syncExploreGoogleMap() {
    const frame = $('#explore-google-map');
    if (!frame) return;
    const selected = getSelectedPublicAlbum();
    const lat = Number.isFinite(Number(selected?.lat)) ? Number(selected.lat) : 36.45;
    const lng = Number.isFinite(Number(selected?.lng)) ? Number(selected.lng) : 127.85;
    const nextSrc = `https://www.google.com/maps?q=${lat},${lng}&z=${state.exploreZoom}&output=embed`;
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
    await runPendingAuthAction();
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
    await runPendingAuthAction();
}

async function handleSocialLogin(provider) {
    const message = $('#auth-message');
    if (message) message.textContent = `${provider === 'google' ? 'Google' : 'Kakao'} 로그인으로 이동합니다...`;
    storePendingAuthContext(window.sessionStorage, state, {
        route: getCurrentRoute(),
        visibility: state.visibility
    });
    const { error } = provider === 'google'
        ? await signInWithGoogle()
        : await signInWithKakao();
    if (error && message) {
        message.textContent = error.message || '소셜 로그인으로 이동하지 못했습니다.';
    }
}

async function runPendingAuthAction() {
    const action = takePendingAuthAction(state);
    if (action === 'persist-upload') {
        await persistStagedPhotos();
        return;
    }
    if (action === 'save-share') await saveShareSettings();
}

function bindEvents() {
    $$('[data-route]').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            routeTo(link.dataset.route);
        });
    });
    $$('[data-mobile-route]').forEach((button) => button.addEventListener('click', () => routeTo(button.dataset.mobileRoute)));
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
    $$('[data-open-photo-detail]').forEach((button) => button.addEventListener('click', () => {
        updatePhotoDetailModal(getDefaultDetailPhoto());
        openModal('#photo-detail-modal');
    }));
    document.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) return;

        const locationButton = event.target.closest('[data-open-location-editor]');
        if (locationButton) {
            openLocationEditor({ currentTarget: locationButton });
            return;
        }

        const selectorButton = event.target.closest('[data-select-location-photo]');
        if (selectorButton) setLocationEditorPhoto(selectorButton.dataset.selectLocationPhoto);
    });
    $$('[data-explore-pin]').forEach((button) => button.addEventListener('click', () => {
        if (button.dataset.publicAlbumId) setSelectedPublicAlbum(button.dataset.publicAlbumId);
        document.body.classList.add('explore-pin-selected');
        $('#explore-pin-preview')?.removeAttribute('hidden');
    }));
    $('#btn-close-pin-preview')?.addEventListener('click', () => {
        document.body.classList.remove('explore-pin-selected');
        $('#explore-pin-preview')?.setAttribute('hidden', '');
    });
    $$('[data-map-zoom]').forEach((button) => button.addEventListener('click', () => updateExploreZoom(button.dataset.mapZoom)));
    $('[data-map-reset]')?.addEventListener('click', () => {
        state.exploreZoom = 7;
        syncExploreGoogleMap();
    });
    $('#btn-open-share-settings')?.addEventListener('click', () => routeTo('share'));
    $$('[data-visibility]').forEach((button) => button.addEventListener('click', () => setVisibilityMode(button.dataset.visibility)));
    $$('[data-visibility-shortcut]').forEach((button) => {
        button.addEventListener('click', () => {
            setVisibilityMode(button.dataset.visibilityShortcut);
            if (button.dataset.visibilityShortcut === 'link') showToast('공유 링크 설정을 선택했습니다.');
        });
    });
    $('#btn-save-share-settings')?.addEventListener('click', saveShareSettings);
    $$('[data-profile-tab]').forEach((button) => button.addEventListener('click', () => setProfileTab(button.dataset.profileTab)));
    $('#btn-copy-share-link')?.addEventListener('click', copyCurrentShareLink);
    $('#btn-copy-trip-link')?.addEventListener('click', copyCurrentShareLink);
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
    $('#btn-google-login')?.addEventListener('click', () => handleSocialLogin('google'));
    $('#btn-kakao-login')?.addEventListener('click', () => handleSocialLogin('kakao'));
    $('#location-editor-form')?.addEventListener('submit', saveManualLocation);
    $$('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModals));
    $$('.modal').forEach((modal) => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeModals();
        });
    });
    window.addEventListener('hashchange', () => renderRoute(parseRouteHash(window.location.hash)));
}

document.addEventListener('DOMContentLoaded', async () => {
    const restoredAuthContext = restorePendingAuthContext(window.sessionStorage, state);
    if (restoredAuthContext?.visibility) state.visibility = restoredAuthContext.visibility;
    const sharedAlbumId = parseSharedAlbumId(window.location.hash);
    if (sharedAlbumId) state.selectedPublicAlbumId = sharedAlbumId;
    state.currentUser = await getCurrentUser();
    updateAccountUI();
    await loadSavedPhotos();
    await loadSavedAlbums();
    bindEvents();
    renderStagedPhotos();
    renderSavedPhotoSurfaces();
    renderTravelDraftSurfaces();
    renderExploreList();
    setVisibilityMode(state.visibility);
    setProfileTab(state.profileTab);
    routeTo(restoredAuthContext?.route || parseRouteHash(window.location.hash), { replace: !window.location.hash });
    if (state.currentUser) await runPendingAuthAction();
});
