import {
    attachPhotosToAlbum,
    createAlbum,
    deleteAlbum,
    detachPhotosFromAlbum,
    fetchAlbums,
    fetchPhotos,
    fetchProfilesByIds,
    getCurrentUser,
    signInWithEmail,
    signOut,
    signUpWithEmail,
    signInWithGoogle,
    signInWithKakao,
    updatePhotoInfo,
    updatePhotosVisibility,
    uploadImage,
    updateAlbum,
    updateAlbumVisibility,
    deletePhoto,
    replaceAlbumPhotos,
    upsertPhoto
} from '../auth.js';
import { selectAlbumForSharing } from './album-sharing-selection.mjs';
import { APP_SECTIONS, normalizeAppSection, parseSectionHash } from './app-sections.mjs';
import { getDroppedFiles, getUploadDropzoneClass } from './drag-drop-files.mjs';
import { shouldOpenExplorePreview } from './explore-selection.mjs';
import {
    getLocationEditorPhoto,
    getMissingLocationPhotos,
    normalizeLocationDraft
} from './location-workflow.mjs';
import { hasUsableCoordinates, hasUsablePhotoLocation } from './photo-location.mjs';
import { getMyphotoAlbumAction } from './myphoto-album-action.mjs';
import {
    restorePendingAuthContext,
    setPendingAuthAction,
    storePendingAuthContext,
    takePendingAuthAction
} from './pending-auth-action.mjs';
import { filterAcceptedPhotoFiles } from './photo-file-validation.mjs';
import { readPhotoExif } from './photo-exif-reader.mjs';
import {
    getSelectedPersonalPhotos,
    prunePersonalPhotoSelection,
    removeSelectedPersonalPhotos,
    togglePersonalPhotoSelection
} from './personal-photo-selection.mjs';
import { getPublicAlbumEmptyState } from './public-album-empty-state.mjs';
import { getPublicAlbumCardClass } from './public-album-card-state.mjs';
import { getAuthorInitials, getPublicAuthorName } from './public-author.mjs';
import { getProfileAlbums, getProfileAlbumStats, getProfileMapCenter, getRelatedAlbums } from './public-profile-albums.mjs';
import { getProfileHeroImage } from './public-profile-hero.mjs';
import { getPublicTripDayCards } from './public-trip-days.mjs';
import { getPublicTripRouteMeta } from './public-trip-meta.mjs';
import { formatMissingLocationSummary, getMyphotoStats } from './myphoto-stats.mjs';
import { getShareCompletionHash, getShareTargetAlbumId } from './share-completion.mjs';
import { buildAlbumRouteHash, buildTripHash, buildTripShareUrl, getSharedRouteState, getShareUrlAlbumId, parseSharedAlbumId } from './share-link.mjs';
import { getShareSaveControlState } from './share-save-state.mjs';
import { getVisibilityStatusText } from './visibility-label.mjs';
import { getVisibilityShortcutAction } from './visibility-shortcut.mjs';
import {
    getDraftPhotoCount,
    getTravelDraftPhotoIds,
    getTravelDraftPhotos
} from './travel-draft-photos.mjs';
import { getTravelDaySummaries } from './travel-days.mjs';
import { getTravelSummary } from './travel-summary.mjs';
import { getUploadNextRoute } from './upload-flow-action.mjs';
import {
    appendUploadPhotos,
    countSelectedUploadPhotos,
    getSelectedUploadPhotos,
    shouldClearUploadQueue,
    toggleUploadPhotoSelection
} from './upload-photo-selection.mjs';
import { getAlbumReviewDaySections } from './album-review-layout.mjs';
import {
    getAlbumPhotoIdsAfterRemoval,
    getAlbumPhotoRemovalTarget,
    mergeAlbumPhotoIds,
    shouldOpenAlbumDetailPhotoClick
} from './album-detail-edit-state.mjs';
import { getExploreMarkerClusters } from './explore-marker-clusters.mjs';
import {
    formatAlbumCount,
    formatDayCount,
    formatPhotoCount,
    formatPhotoPlaceMeta,
    formatPlaceCount
} from './copy-formatters.mjs';
import { getPublicDemoAlbums, getPublicDemoPhotos } from './public-demo-data.mjs';

const state = {
    currentUser: null,
    stagedPhotos: [],
    savedPhotos: [],
    savedAlbums: [],
    profileNames: {},
    lastSavedPhotoIds: [],
    albumDrafts: [],
    visibility: 'private',
    profileTab: 'map',
    selectedPublicAlbumId: null,
    selectedPhotoId: null,
    selectedPersonalPhotoIds: [],
    albumBuilderPhotoIds: [],
    albumPhotoPickerIds: [],
    albumPhotoPickerReturnRoute: null,
    editingAlbumId: null,
    albumDetailEditMode: false,
    albumDetailPhotos: [],
    removedAlbumPhotoKeys: {},
    editingPhotoVisibility: 'private',
    selectedLocationPhotoId: null,
    pendingAuthAction: null,
    exploreZoom: 7,
    exploreMap: null,
    exploreMarkers: [],
    exploreClusterListener: null,
    exploreMarkerPhotos: [],
    exploreSelectedAlbumId: null,
    exploreSearchBox: null,
    exploreMapLoadPromise: null,
    tripReviewMap: null,
    tripReviewMarkers: [],
    googleMapsApiKey: null,
    googleMapsApiKeyPromise: null,
    isPersistingUpload: false,
    isSavingShare: false
};

const getCurrentRoute = () => parseRouteHash(window.location.hash);

const ROUTES = new Set(['home', 'myphoto', 'explore', 'upload', 'photos', 'album', 'album-photos', 'trip', 'profile']);
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

function routeToPublic(section, albumId, { replace = false } = {}) {
    const normalized = ROUTES.has(section) ? section : normalizeAppSection(section);
    const selectedAlbumId = albumId || getSelectedPublicAlbum()?.id || state.selectedPublicAlbumId;
    const hash = buildAlbumRouteHash(normalized, selectedAlbumId);
    if (selectedAlbumId) state.selectedPublicAlbumId = selectedAlbumId;
    if (replace) window.history.replaceState(null, '', hash);
    else if (window.location.hash !== hash) window.location.hash = hash;
    renderRoute(normalized);
}

function routeToTrip(albumId, options = {}) {
    routeToPublic('trip', albumId, options);
}

function clearUploadQueue() {
    state.stagedPhotos.forEach((photo) => URL.revokeObjectURL(photo.url));
    state.stagedPhotos = [];
    renderStagedPhotos();
}

function renderRoute(section) {
    const normalized = ROUTES.has(section) ? section : normalizeAppSection(section);
    const previousRoute = document.body.dataset.page || null;
    if (shouldClearUploadQueue(previousRoute, normalized) && state.stagedPhotos.length) {
        clearUploadQueue();
    }
    if (normalized !== 'trip') state.albumDetailEditMode = false;
    const navSection = ['upload', 'photos', 'album', 'album-photos', 'trip'].includes(normalized)
        ? APP_SECTIONS.MYPHOTO
        : ['profile'].includes(normalized)
            ? APP_SECTIONS.EXPLORE
            : normalized;

    document.body.dataset.page = normalized;
    $$('.page').forEach((page) => page.classList.remove('active'));
    $(`#page-${normalized}`)?.classList.add('active');
    $$('[data-route]').forEach((link) => link.classList.toggle('active', link.dataset.route === navSection));
    $$('[data-mobile-route]').forEach((button) => button.classList.toggle('active', button.dataset.mobileRoute === navSection));
    if (normalized === 'album') renderAlbumComposePage();
    if (normalized === 'album-photos') renderAlbumPhotoPickerPage();
    if (normalized === 'trip' || normalized === 'profile') renderPublicSurfaces();
    if (normalized === APP_SECTIONS.EXPLORE) {
        ensureExploreMap();
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

function applyRouteHash(hash, options = {}) {
    const sharedRoute = getSharedRouteState(hash);
    if (sharedRoute.albumId) state.selectedPublicAlbumId = sharedRoute.albumId;
    const route = sharedRoute.route || parseRouteHash(hash);
    const normalized = ROUTES.has(route) ? route : normalizeAppSection(route);
    if (options.replace) {
        const nextHash = hash && hash.startsWith('#/')
            ? hash
            : normalized === 'home'
                ? '#/'
                : `#/${normalized}`;
        window.history.replaceState(null, '', nextHash);
    }
    renderRoute(normalized);
    if (sharedRoute.albumId) renderPublicSurfaces();
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
    return selectedAlbum?.photos?.[0]
        || getAllDisplayPhotos()[0]
        || { id: 'empty-detail', name: '여행 사진', url: 'images/main_bg2.jpg', date: new Date().toISOString(), album: selectedAlbum?.title || '여행 앨범', visibility: selectedAlbum?.visibility || 'private' };
}

function hasPhotoLocation(photo) {
    return hasUsablePhotoLocation(photo);
}

function getPhotoMapUrl(photo, zoom = 14) {
    if (!hasPhotoLocation(photo)) return '';
    return `https://www.google.com/maps?q=${Number(photo.lat)},${Number(photo.lng)}&z=${zoom}&output=embed`;
}

function formatPhotoDateInput(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '';
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 16);
}

function getLocatedPublicPhotos(albums = getPublicAlbums()) {
    return albums.flatMap((album) => (album.photos || [])
        .filter(hasPhotoLocation)
        .map((photo) => ({
            ...photo,
            album_id: photo.album_id || album.id,
            album: photo.album || album.title,
            albumTitle: album.title,
            albumNote: album.note,
            albumVisibility: album.visibility,
            albumCoverUrl: album.cover_url,
            albumOwnerId: album.owner_id
        })));
}

function getExplorePinPosition(photo, photos) {
    const lats = photos.map((item) => Number(item.lat));
    const lngs = photos.map((item) => Number(item.lng));
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 1;
    const lngRange = maxLng - minLng || 1;
    const left = 8 + ((Number(photo.lng) - minLng) / lngRange) * 84;
    const top = 8 + ((maxLat - Number(photo.lat)) / latRange) * 84;
    return {
        top: Math.min(92, Math.max(8, top)),
        left: Math.min(92, Math.max(8, left))
    };
}

function updateExplorePhotoPreview(photo) {
    const preview = $('#explore-pin-preview');
    if (!preview || !photo) return;
    const image = preview.querySelector('img');
    const title = preview.querySelector('.pin-preview-copy h2');
    const note = preview.querySelector('.pin-preview-copy p:last-child');
    const meta = preview.querySelector('.pin-preview-meta');
    const tripButton = preview.querySelector('[data-go-trip]');
    const profileButton = preview.querySelector('[data-go-profile]');
    const date = photo.date ? new Date(photo.date) : null;
    const dateLabel = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '날짜 없음';
    if (image) {
        image.src = photo.url || photo.albumCoverUrl || 'images/main_bg2.jpg';
        image.alt = photo.name || photo.albumTitle || '공개 사진';
    }
    if (title) title.textContent = photo.name || photo.albumTitle || '공개 사진';
    if (note) note.textContent = photo.description || photo.albumNote || photo.albumTitle || '';
    if (meta) {
        meta.innerHTML = `
            <span><span class="material-symbols-outlined">calendar_today</span> ${dateLabel}</span>
            <span><span class="material-symbols-outlined">place</span> ${Number(photo.lat).toFixed(4)}, ${Number(photo.lng).toFixed(4)}</span>
            <span><span class="material-symbols-outlined">public</span> ${photo.albumVisibility === 'link' ? '링크' : '공개'}</span>
        `;
    }
    if (tripButton) tripButton.dataset.publicAlbumId = photo.album_id || '';
    if (profileButton) profileButton.dataset.publicAlbumId = photo.album_id || '';
    updatePhotoDetailModal(photo);
}

async function getGoogleMapsApiKey() {
    if (window.GOOGLE_MAPS_API_KEY) return window.GOOGLE_MAPS_API_KEY;
    if (state.googleMapsApiKey !== null) return state.googleMapsApiKey;
    if (state.googleMapsApiKeyPromise) return state.googleMapsApiKeyPromise;

    const buildTimeKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    if (buildTimeKey) {
        state.googleMapsApiKey = buildTimeKey;
        return state.googleMapsApiKey;
    }

    state.googleMapsApiKeyPromise = fetch('/api/config', { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : null))
        .then((config) => {
            state.googleMapsApiKey = config?.googleMapsApiKey || '';
            return state.googleMapsApiKey;
        })
        .catch(() => {
            state.googleMapsApiKey = '';
            return '';
        })
        .finally(() => {
            state.googleMapsApiKeyPromise = null;
        });

    return state.googleMapsApiKeyPromise;
}

function loadGoogleMapsApi() {
    if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
    if (state.exploreMapLoadPromise) return state.exploreMapLoadPromise;

    state.exploreMapLoadPromise = getGoogleMapsApiKey().then((key) => {
        if (!key) return null;

        return new Promise((resolve, reject) => {
            const callbackName = `initTravelgramGoogleMap${Date.now()}`;
            window[callbackName] = () => {
                resolve(window.google.maps);
                delete window[callbackName];
            };
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=${callbackName}`;
            script.async = true;
            script.defer = true;
            script.onerror = () => reject(new Error('Google Maps API failed to load'));
            document.head.appendChild(script);
        });
    }).catch((error) => {
        showToast('Google 지도 로드에 실패했습니다.');
        return null;
    });
    return state.exploreMapLoadPromise;
}

async function ensureExploreMap() {
    const container = $('#explore-map');
    if (!container) return null;
    if (state.exploreMap) return state.exploreMap;

    const maps = await loadGoogleMapsApi();
    if (!maps) {
        container.innerHTML = '<div class="map-api-warning"><strong>Google Maps API 키가 필요합니다.</strong><span>VITE_GOOGLE_MAPS_API_KEY를 설정하면 Google 지도와 Places 검색이 표시됩니다.</span></div>';
        return null;
    }

    state.exploreMap = new maps.Map(container, {
        center: { lat: 36.45, lng: 127.85 },
        zoom: state.exploreZoom,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        gestureHandling: 'greedy'
    });

    const input = $('#explore-map-search-input');
    if (input && maps.places?.SearchBox) {
        state.exploreSearchBox = new maps.places.SearchBox(input);
        state.exploreMap.addListener('bounds_changed', () => {
            state.exploreSearchBox.setBounds(state.exploreMap.getBounds());
        });
        state.exploreSearchBox.addListener('places_changed', () => {
            const [place] = state.exploreSearchBox.getPlaces() || [];
            if (!place?.geometry?.location) return;
            state.exploreMap.panTo(place.geometry.location);
            state.exploreMap.setZoom(13);
        });
    }
    return state.exploreMap;
}

function getExplorePinIcon(maps, { selected = false, isCluster = false } = {}) {
    const size = isCluster ? 46 : selected ? 42 : 34;
    const fill = isCluster ? '#0e5a5c' : selected ? '#f28a72' : '#155659';
    const stroke = '#ffffff';
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
            <path d="M24 45s15-13.4 15-27A15 15 0 0 0 9 18c0 13.6 15 27 15 27Z" fill="${fill}" stroke="${stroke}" stroke-width="3"/>
            <circle cx="24" cy="18" r="${isCluster ? 13 : 6}" fill="${isCluster ? fill : stroke}"/>
        </svg>
    `.trim();
    return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: new maps.Size(size, size),
        anchor: new maps.Point(size / 2, size)
    };
}

async function renderExploreMapMarkers(locatedPhotos, selectedAlbumId) {
    const map = await ensureExploreMap();
    const maps = window.google?.maps;
    if (!map || !maps) return;

    state.exploreMarkerPhotos = locatedPhotos;
    state.exploreSelectedAlbumId = selectedAlbumId;
    state.exploreMarkers.forEach((marker) => marker.setMap(null));
    const clusters = getExploreMarkerClusters(locatedPhotos, map.getZoom() || state.exploreZoom);
    state.exploreMarkers = clusters.map((cluster) => {
        const photo = cluster.photos[0];
        const selected = cluster.photos.some((item) => item.album_id === selectedAlbumId || item.id === state.selectedPhotoId);
        const isCluster = cluster.count > 1;
        const marker = new maps.Marker({
            map,
            position: cluster.position,
            title: isCluster ? formatPhotoCount(cluster.count) : (photo.name || photo.albumTitle || '공개 사진'),
            icon: getExplorePinIcon(maps, { selected, isCluster }),
            label: isCluster ? {
                text: String(cluster.count),
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '900'
            } : null,
            zIndex: selected ? 20 : isCluster ? 15 : 10
        });
        marker.addListener('click', () => {
            const previewPhoto = cluster.photos.find((item) => item.album_id === selectedAlbumId) || photo;
            if (isCluster && map.getZoom() < 15) {
                map.panTo(cluster.position);
                map.setZoom((map.getZoom() || state.exploreZoom) + 2);
                return;
            }
            if (previewPhoto.album_id) setSelectedPublicAlbum(previewPhoto.album_id);
            updateExplorePhotoPreview(previewPhoto);
            renderExploreMapMarkers(locatedPhotos, previewPhoto.album_id);
            document.body.classList.add('explore-pin-selected');
            $('#explore-pin-preview')?.removeAttribute('hidden');
        });
        return marker;
    });
    if (!state.exploreClusterListener) {
        state.exploreClusterListener = map.addListener('zoom_changed', () => {
            renderExploreMapMarkers(state.exploreMarkerPhotos, state.exploreSelectedAlbumId);
        });
    }

    const selectedPhoto = locatedPhotos.find((photo) => photo.album_id === selectedAlbumId) || locatedPhotos[0];
    if (selectedPhoto) {
        map.panTo({ lat: Number(selectedPhoto.lat), lng: Number(selectedPhoto.lng) });
        if (map.getZoom() < state.exploreZoom) map.setZoom(state.exploreZoom);
    }
}

function updatePhotoDetailModal(photo = getDefaultDetailPhoto()) {
    state.selectedPhotoId = photo.id || null;
    const modal = $('#photo-detail-modal');
    const image = modal?.querySelector('.photo-detail-card > img');
    const title = $('#photo-detail-title');
    const meta = modal?.querySelector('.photo-detail-card section > p:not(.eyebrow)');
    const map = $('#photo-detail-map');
    const mapFrame = $('#photo-detail-map-frame');
    const visibilityValue = $('#photo-detail-visibility');
    const date = photo.date ? new Date(photo.date) : null;
    const dateLabel = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '날짜 미상';

    if (image) {
        image.src = photo.url || 'images/main_bg2.jpg';
        image.alt = photo.name || '여행 사진 상세';
    }
    if (title) title.textContent = photo.name || '여행 사진';
    if (meta) meta.textContent = `${dateLabel} · ${hasPhotoLocation(photo) ? `${Number(photo.lat).toFixed(4)}, ${Number(photo.lng).toFixed(4)}` : '위치 정보 없음'}`;
    if (map && mapFrame) {
        const mapUrl = getPhotoMapUrl(photo);
        if (mapUrl) {
            mapFrame.src = mapUrl;
            map.removeAttribute('hidden');
        } else {
            mapFrame.removeAttribute('src');
            map.setAttribute('hidden', '');
        }
    }
    if (visibilityValue) visibilityValue.textContent = photo.shared || photo.visibility === 'public' ? '공개' : '비공개';
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
    const hasLocation = hasUsableCoordinates(photo.lat, photo.lng);
    return {
        id: photo.id,
        name: photo.title || photo.description || '여행 사진',
        description: photo.description || '',
        url: photo.url,
        date: photo.date || photo.created_at || new Date().toISOString(),
        lat: hasLocation ? Number(photo.lat) : null,
        lng: hasLocation ? Number(photo.lng) : null,
        shared: !!photo.shared || photo.visibility === 'public',
        owner_id: photo.owner_id,
        album_id: photo.album_id || null,
        visibility: photo.visibility || (photo.shared ? 'public' : 'private'),
        album: photo.album || null
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
    return getTravelDraftPhotos({
        staged: state.stagedPhotos,
        saved: getMySavedPhotos(),
        demos: getDemoDraftPhotos()
    });
}

function getAlbumCandidatePhotos() {
    const selectedIds = new Set(state.albumBuilderPhotoIds);
    return getMySavedPhotos().filter((photo) => selectedIds.has(photo.id));
}

function getDemoDraftPhotos() {
    return [
        { name: 'Cover', url: 'images/main_bg1.jpg' },
        { name: 'Route', url: 'images/main_bg2.jpg' },
        { name: 'Public', url: 'images/main_bg3.jpg' },
        { name: 'Private', url: 'images/main_bg4.jpg' }
    ];
}

function getAlbumPhotoRemovalKeys(photo = {}) {
    return [photo.id, photo.localId, photo.url]
        .filter(Boolean)
        .map((value) => String(value));
}

function getRemovedAlbumPhotoKeys(albumId) {
    return new Set(state.removedAlbumPhotoKeys[String(albumId)] || []);
}

function markAlbumPhotoRemoved(albumId, photo) {
    if (!albumId || !photo) return;
    const key = String(albumId);
    const current = getRemovedAlbumPhotoKeys(albumId);
    getAlbumPhotoRemovalKeys(photo).forEach((photoKey) => current.add(photoKey));
    state.removedAlbumPhotoKeys[key] = [...current];
}

function isAlbumPhotoRemoved(albumId, photo) {
    const removed = getRemovedAlbumPhotoKeys(albumId);
    return getAlbumPhotoRemovalKeys(photo).some((photoKey) => removed.has(photoKey));
}

function getFallbackPublicPhotos(album) {
    return getPublicDemoPhotos(album);
}

function getFallbackPublicAlbums() {
    return getPublicDemoAlbums();
}

function getPublicAlbums() {
    const publicAlbums = state.savedAlbums
        .filter((album) => ['public', 'link'].includes(album.visibility) || album.owner_id === state.currentUser?.id)
        .map((album, index) => {
            const photos = state.savedPhotos.filter((photo) => {
                if (isAlbumPhotoRemoved(album.id, photo)) return false;
                const publicPhoto = photo.owner_id === state.currentUser?.id || photo.shared || ['public', 'link'].includes(photo.visibility);
                const sameAlbum = photo.album_id
                    ? photo.album_id === album.id
                    : photo.album === album.title;
                return publicPhoto && sameAlbum;
            });
            const locatedPhotos = photos.filter(hasPhotoLocation);
            const lat = locatedPhotos.length
                ? locatedPhotos.reduce((sum, photo) => sum + photo.lat, 0) / locatedPhotos.length
                : null;
            const lng = locatedPhotos.length
                ? locatedPhotos.reduce((sum, photo) => sum + photo.lng, 0) / locatedPhotos.length
                : null;
            return {
                ...album,
                cover_url: album.cover_url || photos[0]?.url || getDraftPhotos()[index % getDraftPhotos().length]?.url || 'images/main_bg2.jpg',
                photo_count: Number(album.photo_count || photos.length || 1),
                places: locatedPhotos.length,
                lat,
                lng,
                photos
            };
        });
    if (publicAlbums.length) return publicAlbums;
    return getFallbackPublicAlbums().map((album) => {
        const photos = getFallbackPublicPhotos(album);
        return {
            ...album,
            photo_count: photos.length,
            places: photos.length,
            photos
        };
    });
}

function getSelectedPublicAlbum() {
    const albums = getPublicAlbums();
    return albums.find((album) => album.id === state.selectedPublicAlbumId) || albums[0];
}

function getSelectedAuthorName(album = getSelectedPublicAlbum()) {
    return getPublicAuthorName(album, {
        currentUser: state.currentUser,
        profileNames: state.profileNames
    });
}

function setSelectedPublicAlbum(albumId) {
    state.selectedPublicAlbumId = albumId;
    renderPublicSurfaces();
}

function getCurrentShareUrl() {
    return buildTripShareUrl(window.location.origin, getShareUrlAlbumId(state.selectedPublicAlbumId, getSelectedPublicAlbum()));
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

function renderEmptyPublicSurfaces() {
    const empty = getPublicAlbumEmptyState();
    const shareOutput = $('#share-link-output');
    if (shareOutput) shareOutput.value = getCurrentShareUrl();

    const preview = $('#explore-pin-preview');
    const previewImage = preview?.querySelector('img');
    const previewTitle = preview?.querySelector('.pin-preview-copy h2');
    const previewNote = preview?.querySelector('.pin-preview-copy p:last-child');
    const previewMeta = preview?.querySelector('.pin-preview-meta');
    if (previewImage) {
        previewImage.src = 'images/main_bg2.jpg';
        previewImage.alt = empty.title;
    }
    if (previewTitle) previewTitle.textContent = empty.title;
    if (previewNote) previewNote.textContent = empty.body;
    if (previewMeta) previewMeta.textContent = empty.meta;

    const tripHeroImage = $('.public-trip-hero > img');
    if (tripHeroImage) {
        tripHeroImage.src = 'images/main_bg2.jpg';
        tripHeroImage.alt = empty.title;
    }
    $('#trip-title') && ($('#trip-title').textContent = empty.title);
    const tripCopy = $('.public-trip-copy > p:not(.eyebrow)');
    if (tripCopy) tripCopy.textContent = empty.body;
    const routeMeta = $('.trip-route-card .compact-heading p');
    if (routeMeta) routeMeta.textContent = empty.meta;

    const emptyCard = `
        <article class="empty-state">
            <strong>${empty.title}</strong>
            <span>${empty.body}</span>
        </article>
    `;
    $('#explore-list') && ($('#explore-list').innerHTML = emptyCard);
    $('#public-trip-photo-grid') && ($('#public-trip-photo-grid').innerHTML = emptyCard);
    $('.trip-day-grid') && ($('.trip-day-grid').innerHTML = emptyCard);
    $('.related-album-grid') && ($('.related-album-grid').innerHTML = '');
    $('.profile-album-grid') && ($('.profile-album-grid').innerHTML = emptyCard);
    $('.route-strip') && ($('.route-strip').innerHTML = '<span>공개 지도</span>');
    $('.profile-stats') && ($('.profile-stats').innerHTML = '<span><strong>0</strong>개 앨범</span><span><strong>0</strong>장</span><span><strong>0</strong>곳</span>');
    $$('.public-author-card h2, #profile-title, .pin-author strong').forEach((node) => {
        node.textContent = 'Ikkyee';
    });
    $$('.public-author-card .avatar, .profile-card .avatar, .pin-author .avatar').forEach((avatar) => {
        avatar.textContent = 'IK';
    });
    $$('[data-explore-pin]').forEach((target) => {
        delete target.dataset.publicAlbumId;
        target.classList.remove('is-selected');
    });
    const photoPinLayer = $('#explore-photo-pins');
    if (photoPinLayer) photoPinLayer.innerHTML = '';
    if (state.exploreMarkers.length) {
        state.exploreMarkers.forEach((marker) => marker.setMap?.(null));
        state.exploreMarkers = [];
    }
}

function renderTripReviewShell() {
    const page = $('#page-trip');
    if (!page) return;
    page.innerHTML = `
        <div class="trip-review-shell">
            <header class="trip-review-header">
                <button class="back-link" data-route="explore" type="button">
                    <span class="material-symbols-outlined">arrow_back</span>
                    <span id="trip-review-back-label">Explore</span>
                </button>
                <div class="trip-review-title-block">
                    <p class="eyebrow">Album Review Map</p>
                    <h1 id="trip-title">Album</h1>
                    <p id="trip-review-description">사진이 날짜별로 정리된 앨범 지도입니다.</p>
                    <div id="trip-review-meta" class="trip-review-meta"></div>
                </div>
                <div class="trip-actions">
                    <button class="btn-primary" data-open-photo-detail type="button">대표 사진 보기</button>
                    <button class="btn-secondary" data-go-profile type="button">작성자 프로필</button>
                    <button id="btn-copy-trip-link" class="btn-secondary" type="button">링크 복사</button>
                </div>
            </header>
            <div class="trip-review-layout">
                <main class="trip-review-timeline" aria-labelledby="trip-photo-title">
                    <h2 id="trip-photo-title">날짜별 사진</h2>
                    <div id="public-trip-photo-grid" class="trip-review-photo-flow"></div>
                </main>
                <aside class="trip-review-map-panel" aria-label="앨범 사진 위치 지도">
                    <div id="trip-review-map" class="trip-review-map"></div>
                </aside>
            </div>
        </div>
    `;
}

function renderTripReviewPhotoFlow(albumPhotos, albumTitle, cover, { isEditing = false } = {}) {
    const grid = $('#public-trip-photo-grid');
    if (!grid) return;
    const sections = getAlbumReviewDaySections(albumPhotos);
    if (!sections.length) {
        grid.innerHTML = `
            <article class="empty-state">
                <strong>${escapeHtml(albumTitle)}</strong>
                <span>앨범에 표시할 사진이 아직 없습니다.</span>
            </article>
        `;
        return;
    }

    grid.innerHTML = sections.map((section) => `
        <section class="trip-review-day">
            <div class="trip-review-day-divider">
                <strong>${escapeHtml(section.dateLabel)}</strong>
                <small>${formatPhotoCount(section.photoCount)}</small>
            </div>
            <div class="trip-review-day-rows">
                ${section.rows.map((row) => `
                    <div class="trip-review-photo-row">
                        ${row.map((photo) => `
                            <article
                                class="trip-review-photo-card ${isEditing ? 'is-editing' : ''}"
                                style="--photo-width: ${Math.round(Number(photo.aspectRatio || 1) * 220)}px;"
                                ${isEditing ? '' : 'data-open-photo-detail'}
                                data-photo-id="${escapeHtml(photo.id || photo.localId || '')}"
                            >
                                ${isEditing ? `<button class="trip-review-photo-remove" data-remove-trip-photo="${escapeHtml(photo.id || photo.localId || '')}" data-remove-trip-photo-index="${Number(photo._albumReviewIndex ?? -1)}" type="button" aria-label="앨범에서 사진 삭제">×</button>` : ''}
                                <img src="${photo.url || cover}" alt="${escapeHtml(photo.name || albumTitle)}">
                            </article>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
        </section>
    `).join('');
}

async function renderTripReviewMap(albumPhotos) {
    const container = $('#trip-review-map');
    if (!container) return;
    const located = albumPhotos.filter(hasPhotoLocation);
    if (!located.length) {
        state.tripReviewMarkers.forEach((marker) => marker.setMap?.(null));
        state.tripReviewMarkers = [];
        state.tripReviewMap = null;
        container.innerHTML = '<div class="map-api-warning"><strong>위치 정보가 있는 사진이 없습니다.</strong><span>위치가 저장된 사진을 추가하면 지도에 표시됩니다.</span></div>';
        return;
    }

    const maps = await loadGoogleMapsApi();
    if (!maps) {
        container.innerHTML = '<div class="map-api-warning"><strong>Google Maps API 키가 필요합니다.</strong><span>지도 설정이 완료되면 앨범 위치가 표시됩니다.</span></div>';
        return;
    }

    const center = { lat: Number(located[0].lat), lng: Number(located[0].lng) };
    state.tripReviewMap = new maps.Map(container, {
        center,
        zoom: located.length > 1 ? 11 : 13,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        gestureHandling: 'greedy'
    });

    state.tripReviewMarkers.forEach((marker) => marker.setMap(null));
    state.tripReviewMarkers = located.map((photo) => {
        const marker = new maps.Marker({
            position: { lat: Number(photo.lat), lng: Number(photo.lng) },
            map: state.tripReviewMap,
            title: photo.name || '여행 사진'
        });
        marker.addListener('click', () => updatePhotoDetailModal(photo));
        return marker;
    });

    if (located.length > 1) {
        const bounds = new maps.LatLngBounds();
        located.forEach((photo) => bounds.extend({ lat: Number(photo.lat), lng: Number(photo.lng) }));
        state.tripReviewMap.fitBounds(bounds, 72);
    }

}

function renderPublicSurfaces() {
    const albums = getPublicAlbums();
    const selected = getSelectedPublicAlbum();
    if (!selected) {
        renderEmptyPublicSurfaces();
        return;
    }
    if (state.albumDetailEditMode && selected.owner_id !== state.currentUser?.id) {
        state.albumDetailEditMode = false;
    }
    renderTripReviewShell();
    const cover = selected.cover_url || 'images/main_bg2.jpg';
    const note = selected.note || '공개할 사진만 골라 만든 여행 기록입니다.';
    const photoCount = Number(selected.photo_count || 0);
    const places = Number(selected.places || Math.max(1, Math.ceil(photoCount / 4)));
    const tripPhotos = (selected.photos?.length ? selected.photos : getDraftPhotos())
        .filter((photo) => !isAlbumPhotoRemoved(selected.id, photo));
    state.albumDetailPhotos = tripPhotos;
    const tripSummary = getTravelSummary({
        draftPhotos: tripPhotos,
        selectedAlbum: selected
    });
    const authorName = getSelectedAuthorName(selected);
    const authorInitials = getAuthorInitials(authorName);
    const isOwnAlbum = selected.owner_id && selected.owner_id === state.currentUser?.id;
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
            <span><span class="material-symbols-outlined">photo_library</span> ${formatPhotoCount(photoCount || 1)}</span>
            <span><span class="material-symbols-outlined">place</span> ${formatPlaceCount(places)}</span>
            <span><span class="material-symbols-outlined">public</span> ${selected.visibility === 'link' ? '링크' : '공개'}</span>
        `;
    }
    const shareOutput = $('#share-link-output');
    if (shareOutput) shareOutput.value = getCurrentShareUrl();

    const tripHeroImage = $('.public-trip-hero > img');
    const tripTitle = $('#trip-title');
    const tripCopy = $('.public-trip-copy > p:not(.eyebrow)');
    const tripActions = $('.public-trip-copy .trip-actions');
    const tripReviewDescription = $('#trip-review-description');
    const tripReviewMeta = $('#trip-review-meta');
    const tripReviewActions = $('.trip-review-header .trip-actions');
    const routeMeta = $('.trip-route-card .compact-heading p');
    if (tripHeroImage) {
        tripHeroImage.src = cover;
        tripHeroImage.alt = selected.title;
    }
    if (tripTitle) tripTitle.textContent = selected.title;
    if (tripCopy) tripCopy.textContent = note;
    if (tripReviewDescription) tripReviewDescription.textContent = note;
    const titleBlock = $('.trip-review-title-block');
    if (titleBlock && isOwnAlbum && state.albumDetailEditMode) {
        const form = document.createElement('div');
        form.className = 'trip-edit-fields';
        form.innerHTML = `
            <label for="trip-edit-title">앨범 이름</label>
            <input id="trip-edit-title" type="text" value="${escapeHtml(selected.title || '')}">
            <label for="trip-edit-note">설명</label>
            <textarea id="trip-edit-note" rows="2">${escapeHtml(selected.note || '')}</textarea>
        `;
        titleBlock.appendChild(form);
    }
    const reviewBackButton = $('.trip-review-header .back-link');
    const reviewBackLabel = $('#trip-review-back-label');
    if (reviewBackButton) reviewBackButton.dataset.route = isOwnAlbum ? 'myphoto' : 'explore';
    if (reviewBackLabel) reviewBackLabel.textContent = isOwnAlbum ? 'Myphoto' : 'Explore';
    if (tripReviewMeta) {
        tripReviewMeta.innerHTML = `
            <span>${tripSummary.dateRange || '날짜 없음'}</span>
            <span>${formatPlaceCount(places)}</span>
            <span>${formatPhotoCount(photoCount || tripPhotos.length)}</span>
        `;
    }
    if (tripReviewActions) {
        tripReviewActions.innerHTML = `
            ${isOwnAlbum ? `<button id="btn-edit-album" class="btn-secondary ${state.albumDetailEditMode ? 'active' : ''}" type="button">${state.albumDetailEditMode ? '수정 완료' : '수정하기'}</button>` : '<button class="btn-secondary" data-go-profile type="button">작성자 프로필</button>'}
            ${isOwnAlbum && state.albumDetailEditMode ? '<button id="btn-add-trip-photos" class="btn-secondary" type="button">사진 추가하기</button>' : ''}
            ${isOwnAlbum && state.albumDetailEditMode ? `<button id="btn-toggle-album-visibility" class="btn-secondary" type="button">${selected.visibility === 'public' ? '비공개로 전환' : '공개로 전환'}</button>` : ''}
            ${isOwnAlbum && state.albumDetailEditMode ? '<button id="btn-set-album-cover" class="btn-secondary" type="button">대표사진 설정</button>' : ''}
            ${isOwnAlbum && state.albumDetailEditMode ? '<button id="btn-delete-album" class="btn-secondary danger" type="button">앨범 삭제</button>' : ''}
        `;
    }
    if (tripActions) {
        const isOwnAlbum = selected.owner_id && selected.owner_id === state.currentUser?.id;
        tripActions.innerHTML = `
            ${isOwnAlbum ? '<button id="btn-edit-album" class="btn-secondary" type="button">수정하기</button>' : '<button class="btn-secondary" data-go-profile type="button">작성자 프로필</button>'}
        `;
    }
    if (routeMeta) routeMeta.textContent = getPublicTripRouteMeta(tripSummary);

    $$('.public-author-card .avatar, .profile-card .avatar, .pin-author .avatar').forEach((avatar) => {
        avatar.textContent = authorInitials;
    });
    $$('.public-author-card h2, #profile-title, .pin-author strong').forEach((nameNode) => {
        nameNode.textContent = authorName;
    });

    const routeStrip = $('.route-strip');
    if (routeStrip) {
        const routeLabels = selected.photos?.filter(hasPhotoLocation).slice(0, 4).map((photo) => photo.name)
            || ['Start', 'Walk', 'View', 'Finish'];
        const labels = routeLabels.length >= 2 ? routeLabels : [selected.title, '공개 지도'];
        routeStrip.innerHTML = labels.slice(0, 4).map((label, index) => (
            `${index ? '<i></i>' : ''}<span>${escapeHtml(label)}</span>`
        )).join('');
    }

    const dayGrid = $('.trip-day-grid');
    if (dayGrid) {
        const dayPhotos = selected.photos?.length ? selected.photos : getDraftPhotos().map((photo, index) => ({
            ...photo,
            date: new Date(Date.now() + index * 86400000).toISOString()
        }));
        dayGrid.innerHTML = getPublicTripDayCards(dayPhotos, selected.title).map((card) => `
            <article>
                <p class="eyebrow">${escapeHtml(card.eyebrow)}</p>
                <h3>${escapeHtml(card.title)}</h3>
                <p>${escapeHtml(card.body)}</p>
            </article>
        `).join('');
    }

    const tripPhotoGrid = $('#public-trip-photo-grid');
    if (tripPhotoGrid) {
        renderTripReviewPhotoFlow(tripPhotos, selected.title, cover, {
            isEditing: isOwnAlbum && state.albumDetailEditMode
        });
    }

    const locatedPhotos = getLocatedPublicPhotos(albums);
    renderTripReviewMap(tripPhotos);
    renderExploreMapMarkers(locatedPhotos, selected.id);
    const selectedPhoto = locatedPhotos.find((photo) => photo.album_id === selected.id) || locatedPhotos[0];
    if (selectedPhoto) updateExplorePhotoPreview(selectedPhoto);

    const relatedGrid = $('.related-album-grid');
    if (relatedGrid) {
        relatedGrid.innerHTML = getRelatedAlbums(albums, selected).map((album) => `
            <article class="${getPublicAlbumCardClass(album.id, selected.id)}" data-public-album-id="${escapeHtml(album.id)}" data-go-trip>
                <img src="${album.cover_url || 'images/main_bg2.jpg'}" alt="">
                <strong>${escapeHtml(album.title)}</strong>
                <span>${formatPhotoPlaceMeta(album.photo_count || 1, album.places || 1)}</span>
            </article>
        `).join('');
    }

    const profileStats = $('.profile-stats');
    const profileAlbums = getProfileAlbums(albums, selected);
    if (profileStats) {
        const stats = getProfileAlbumStats(profileAlbums);
        profileStats.innerHTML = `
            <span><strong>${stats.albums}</strong>개 앨범</span>
            <span><strong>${stats.photos || stats.albums}</strong>장</span>
            <span><strong>${stats.places}</strong>곳</span>
        `;
    }

    const profileMapFrame = $('.profile-map-preview .google-map-frame');
    if (profileMapFrame) {
        const center = getProfileMapCenter(profileAlbums);
        const nextSrc = `https://www.google.com/maps?q=${center.lat},${center.lng}&z=5&output=embed`;
        if (profileMapFrame.src !== nextSrc) profileMapFrame.src = nextSrc;
    }

    const profileGrid = $('.profile-album-grid');
    if (profileGrid) {
        profileGrid.innerHTML = profileAlbums.slice(0, 6).map((album) => `
            <article class="${getPublicAlbumCardClass(album.id, selected.id)}" data-public-album-id="${escapeHtml(album.id)}" data-go-trip>
                <img src="${album.cover_url || 'images/main_bg2.jpg'}" alt="">
                <strong>${escapeHtml(album.title)}</strong>
                <span>${formatPhotoPlaceMeta(album.photo_count || 1, album.places || 1)}</span>
            </article>
        `).join('');
    }

    const profileHeroImage = $('.profile-cover > img');
    if (profileHeroImage) {
        profileHeroImage.src = getProfileHeroImage(selected, profileAlbums);
        profileHeroImage.alt = `${authorName} public profile cover`;
    }

    const list = $('#explore-list');
    if (list) {
        list.innerHTML = albums.map((album) => `
            <article class="explore-item ${getPublicAlbumCardClass(album.id, selected.id)}" data-public-album-id="${escapeHtml(album.id)}">
                <strong>${escapeHtml(album.title)}</strong>
                <span>${formatPhotoPlaceMeta(album.photo_count || 1, album.places || 1)}</span>
            </article>
        `).join('');
    }

    $$('[data-public-album-id]').forEach((item) => {
        item.addEventListener('click', () => {
            setSelectedPublicAlbum(item.dataset.publicAlbumId);
            if (item.hasAttribute('data-go-trip')) routeToTrip(item.dataset.publicAlbumId);
            if (shouldOpenExplorePreview({
                isTripLink: item.hasAttribute('data-go-trip'),
                isExploreListItem: item.classList.contains('explore-item')
            })) {
                document.body.classList.add('explore-pin-selected');
                $('#explore-pin-preview')?.removeAttribute('hidden');
            }
        });
    });
    $$('#public-trip-photo-grid [data-open-photo-detail]').forEach((item) => {
        item.addEventListener('click', (event) => {
            if (!shouldOpenAlbumDetailPhotoClick(event.target, { isEditing: state.albumDetailEditMode })) return;
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

async function loadPublicProfileNames() {
    const ownerIds = [...new Set(state.savedAlbums.map((album) => album.owner_id).filter((id) => id && id !== 'demo'))];
    if (!ownerIds.length) return;
    const { data, error } = await fetchProfilesByIds(ownerIds);
    if (error) return;
    state.profileNames = (data || []).reduce((names, profile) => {
        if (profile.id && profile.nickname) names[profile.id] = profile.nickname;
        return names;
    }, { ...state.profileNames });
    renderPublicSurfaces();
}

function renderSavedPhotoSurfaces() {
    const myPhotos = getMySavedPhotos();
    const missingLocationPhotos = getMissingLocationPhotos(myPhotos);
    const savedAlbums = state.currentUser
        ? state.savedAlbums.filter((album) => album.owner_id === state.currentUser.id)
        : [];
    const stats = getMyphotoStats(myPhotos, savedAlbums);
    const recentGrid = $('#recent-photo-grid');

    $('#stat-photo-count') && ($('#stat-photo-count').textContent = String(stats.photoCount));
    $('#stat-located-count') && ($('#stat-located-count').textContent = String(stats.locatedCount));
    $('#stat-missing-count') && ($('#stat-missing-count').textContent = String(stats.missingLocationCount));
    $('#stat-album-count') && ($('#stat-album-count').textContent = String(stats.albumCount));
    const attentionTitle = $('.attention-banner strong');
    const attentionCopy = $('.attention-banner p');
    if (attentionTitle) attentionTitle.textContent = formatMissingLocationSummary(stats.missingLocationCount);
    if (attentionCopy) {
        attentionCopy.textContent = stats.missingLocationCount
            ? '사진의 메타데이터가 부족해 지도에 표시되지 않고 있습니다.'
            : '새로 추가한 사진 중 위치가 빠진 항목이 생기면 여기에서 알려드릴게요.';
    }
    renderMissingLocationTasks(missingLocationPhotos);
    renderPersonalPhotosPage(myPhotos);

    if (recentGrid) {
        recentGrid.innerHTML = myPhotos.length
            ? myPhotos.slice(0, 8).map((photo) => `
            <article data-open-photo-detail data-photo-id="${escapeHtml(photo.id)}">
                <img src="${photo.url}" alt="${escapeHtml(photo.name)}">
            </article>
        `).join('')
            : '<article class="photo-placeholder"></article>';
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

function renderPersonalPhotosPage(photos = getMySavedPhotos()) {
    const grid = $('#personal-photo-grid');
    const summary = $('#personal-photo-summary');
    const deleteButton = $('#btn-delete-selected-photos');
    state.selectedPersonalPhotoIds = prunePersonalPhotoSelection(state.selectedPersonalPhotoIds, photos);
    const selectedCount = state.selectedPersonalPhotoIds.length;
    if (summary) summary.textContent = formatPhotoCount(photos.length);
    if (deleteButton) {
        deleteButton.disabled = selectedCount === 0;
        deleteButton.textContent = selectedCount ? `선택 ${selectedCount}장 삭제` : '선택 삭제';
    }

    if (!photos.length) {
        grid.innerHTML = `
            <article class="empty-state">
                <strong>아직 올린 개별사진이 없습니다</strong>
                <span>마이포토에서 사진 올리기를 누르면 이곳에 개인 사진이 쌓입니다.</span>
            </article>
        `;
        return;
    }

    grid.innerHTML = photos.map((photo) => {
        const hasLocation = hasPhotoLocation(photo);
        const isSelected = state.selectedPersonalPhotoIds.includes(photo.id);
        return `
            <article class="personal-photo-card ${isSelected ? 'is-selected' : ''}" data-open-photo-detail data-photo-id="${escapeHtml(photo.id)}">
                <button class="photo-select-button" data-toggle-personal-photo="${escapeHtml(photo.id)}" type="button" aria-pressed="${isSelected}" aria-label="사진 선택"></button>
                <img src="${photo.url}" alt="${escapeHtml(photo.name)}">
                <div>
                    <strong>${escapeHtml(photo.name)}</strong>
                    <span>${hasLocation ? '위치 확인됨' : '위치 확인 필요'} · ${photo.visibility === 'public' ? '공개' : '비공개'}</span>
                </div>
            </article>
        `;
    }).join('');
}

async function deleteSelectedPersonalPhotos() {
    const myPhotos = getMySavedPhotos();
    const selectedPhotos = getSelectedPersonalPhotos(myPhotos, state.selectedPersonalPhotoIds);
    if (!selectedPhotos.length) return;

    const deleteButton = $('#btn-delete-selected-photos');
    if (deleteButton) deleteButton.disabled = true;

    try {
        for (const photo of selectedPhotos) {
            const { error } = await deletePhoto(photo.id, photo.url);
            if (error) throw error;
        }
        state.savedPhotos = removeSelectedPersonalPhotos(state.savedPhotos, state.selectedPersonalPhotoIds);
        state.lastSavedPhotoIds = state.lastSavedPhotoIds.filter((id) => !state.selectedPersonalPhotoIds.includes(id));
        state.selectedPersonalPhotoIds = [];
        renderSavedPhotoSurfaces();
        renderPublicSurfaces();
        showToast(`${selectedPhotos.length}장의 사진을 삭제했습니다.`);
    } catch (error) {
        showToast(error.message || '사진 삭제에 실패했습니다.');
        renderPersonalPhotosPage();
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
        <button type="button" data-open-photo-editor data-photo-id="${escapeHtml(photo.id)}">
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
    if (summary) summary.textContent = `${formatPhotoCount(albums.reduce((sum, album) => sum + album.photo_count, 0))} · ${formatAlbumCount(albums.length)}`;
    list.innerHTML = albums.map((album) => {
        const visibilityLabel = album.visibility === 'public' ? '공개' : album.visibility === 'link' ? '링크 공유' : '비공개';
        return `
            <article class="album-row" role="button" tabindex="0" data-myphoto-album-id="${escapeHtml(album.id)}" data-myphoto-album-visibility="${escapeHtml(album.visibility)}">
                <img src="${album.cover_url || 'images/main_bg2.jpg'}" alt="${escapeHtml(album.title)}">
                <div>
                    <span class="status-line"><span class="material-symbols-outlined">${album.visibility === 'public' ? 'public' : 'lock'}</span> ${visibilityLabel} · Supabase</span>
                    <strong>${escapeHtml(album.title)}</strong>
                    <p>${escapeHtml(album.note || '저장된 여행 앨범입니다.')}</p>
                    <small>${formatPhotoCount(album.photo_count)} · 앨범 기록</small>
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
    if (summary) summary.textContent = `${formatPhotoCount(photos.length)} · ${formatAlbumCount(albums.length)}`;
    list.innerHTML = albums.map(([name, albumPhotos]) => {
        const cover = albumPhotos[0];
        const shared = albumPhotos.some((photo) => photo.shared);
        return `
            <article class="album-row" role="button" tabindex="0" data-myphoto-album-name="${escapeHtml(name)}" data-myphoto-album-visibility="${shared ? 'public' : 'private'}">
                <img src="${cover.url}" alt="${escapeHtml(name)}">
                <div>
                    <span class="status-line"><span class="material-symbols-outlined">${shared ? 'public' : 'lock'}</span> ${shared ? '공개' : '비공개'} · 저장됨</span>
                    <strong>${escapeHtml(name)}</strong>
                    <p>저장된 사진을 기준으로 구성한 여행 앨범입니다.</p>
                    <small>${formatPhotoCount(albumPhotos.length)} · Supabase</small>
                </div>
            </article>
        `;
    }).join('');
}

function renderStagedPhotos() {
    const grid = $('#staged-photos');
    const uploadDropzone = $('#upload-dropzone');
    const reviewButton = $('#btn-review-upload');
    const selectedUploadCount = countSelectedUploadPhotos(state.stagedPhotos);
    $('#album-count-label') && ($('#album-count-label').textContent = formatPhotoCount(state.stagedPhotos.length));
    $('#myphoto-summary') && ($('#myphoto-summary').textContent = `${formatPhotoCount(state.stagedPhotos.length)} · ${formatAlbumCount(state.albumDrafts.length)}`);
    $('#upload-total-count') && ($('#upload-total-count').textContent = `${selectedUploadCount}장`);
    $('#upload-result-panel')?.classList.toggle('is-visible', state.stagedPhotos.length > 0);
    if (reviewButton) reviewButton.textContent = '업로드하기';
    renderTravelDraftSurfaces();

    if (!state.stagedPhotos.length) {
        if (uploadDropzone) {
            uploadDropzone.className = 'upload-dropzone';
            uploadDropzone.innerHTML = `
                <input id="photo-input" type="file" multiple accept="image/jpeg,image/png,image/webp">
                <span class="material-symbols-outlined">cloud_upload</span>
                <strong>사진 파일 선택</strong>
                <small>JPG, PNG, WEBP 파일을 선택하거나 이곳에 끌어다 놓을 수 있습니다.</small>
            `;
            bindPhotoInput();
        }
        if (grid) grid.className = 'photo-grid empty';
        if (grid) grid.innerHTML = `
            <div class="empty-state">
                <strong>아직 선택한 사진이 없습니다.</strong>
                <span>사진 올리기를 누르면 업로드 초안을 확인합니다.</span>
            </div>
        `;
        return;
    }

    if (grid) grid.className = 'photo-grid';
    if (uploadDropzone) {
        uploadDropzone.className = 'upload-dropzone upload-thumbnail-zone';
        uploadDropzone.innerHTML = `
            <input id="photo-input" type="file" multiple accept="image/jpeg,image/png,image/webp">
            <div class="upload-thumbnail-grid" aria-label="업로드할 사진 선택">
                ${state.stagedPhotos.map((photo) => `
                    <button class="upload-thumbnail${photo.selected === false ? '' : ' is-selected'}" type="button" data-upload-photo-id="${escapeHtml(photo.localId)}" aria-pressed="${photo.selected === false ? 'false' : 'true'}" draggable="false">
                        <img src="${photo.url}" alt="${escapeHtml(photo.name)}" draggable="false">
                    </button>
                `).join('')}
            </div>
        `;
        bindPhotoInput();
    }
    if (grid) grid.innerHTML = state.stagedPhotos.map((photo) => `
        <article class="photo-card">
            <img src="${photo.url}" alt="${escapeHtml(photo.name)}">
            <span>${escapeHtml(photo.name)}</span>
        </article>
    `).join('');
}

function renderAlbumComposePage() {
    const page = $('#page-album .flow-page');
    if (!page) return;
    const editingAlbum = state.editingAlbumId
        ? state.savedAlbums.find((album) => album.id === state.editingAlbumId)
        : null;
    page.innerHTML = `
        <button class="back-link" data-go-myphoto type="button">
            <span class="material-symbols-outlined">arrow_back</span>
            Myphoto
        </button>
        <div class="album-compose-header">
            <div>
                <p class="eyebrow">Album Builder</p>
                <h1 id="album-title">${editingAlbum ? '앨범 수정하기' : '앨범 만들기'}</h1>
            </div>
            <button id="btn-save-album-draft" class="btn-primary" type="button">저장하기</button>
        </div>
        <section class="album-compose-bar" aria-label="앨범 기본 정보">
            <label for="album-name-input">앨범 이름</label>
            <input id="album-name-input" type="text" placeholder="예: 부산 주말 여행" value="${escapeHtml(editingAlbum?.title || '')}">
            <label for="album-note-input">설명</label>
            <textarea id="album-note-input" rows="2" placeholder="이 앨범에 남길 설명을 적어주세요.">${escapeHtml(editingAlbum?.note || '')}</textarea>
            <div class="album-visibility-toggle" aria-label="공개 여부">
                <button class="${state.visibility === 'private' ? 'active' : ''}" data-visibility="private" type="button">비공개</button>
                <button class="${state.visibility === 'public' ? 'active' : ''}" data-visibility="public" type="button">공개</button>
            </div>
        </section>
        <div class="album-compose-layout">
            <section class="album-compose-photos">
                <div class="panel-topline">
                    <div>
                        <p class="eyebrow">Album Photos</p>
                        <h2 id="analysis-title">나의 여행 앨범</h2>
                    </div>
                    <span><strong id="analysis-photo-count">0</strong>장</span>
                </div>
                <div class="analysis-stats">
                    <span><strong id="analysis-place-count">0</strong>곳</span>
                    <span><strong id="analysis-day-count">0일</strong> 타임라인</span>
                </div>
                <button id="btn-open-album-photo-picker" class="btn-secondary album-add-button" type="button">사진 추가</button>
                <div id="album-day-photo-list" class="album-day-photo-list"></div>
            </section>
            <section class="album-compose-map" aria-label="앨범 지도">
                <iframe id="album-map-frame" class="google-map-frame" title="Google map album photo locations" src="https://www.google.com/maps?q=36.45,127.85&z=7&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
                <div id="album-map-pins" class="album-map-pins" aria-hidden="true"></div>
            </section>
        </div>
    `;
    renderTravelDraftSurfaces();
}

function getAlbumPhotoDayGroups(photos = []) {
    const groups = new Map();
    photos.forEach((photo) => {
        const date = photo.date ? new Date(photo.date) : null;
        const key = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '날짜 없음';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(photo);
    });
    return [...groups.entries()].map(([date, items], index) => ({
        date,
        label: date === '날짜 없음' ? '날짜 없음' : `Day ${index + 1}`,
        title: date === '날짜 없음' ? '날짜별 분류를 기다리는 사진' : date.replaceAll('-', '.'),
        photos: items,
        places: items.filter(hasPhotoLocation).length
    }));
}

function renderAlbumPhotoPickerPage() {
    const root = $('#album-photo-picker-root');
    if (!root) return;
    const photos = getMySavedPhotos();
    const selected = new Set(state.albumPhotoPickerIds);
    root.innerHTML = `
        <div class="album-compose-header">
            <div>
                <p class="eyebrow">Album Photos</p>
                <h1 id="album-photos-title">앨범에 추가할 사진 선택</h1>
            </div>
            <button id="btn-add-selected-album-photos" class="btn-primary" type="button">선택 사진 추가</button>
        </div>
        <section class="album-photo-picker-panel">
            ${photos.length ? `
                <div class="album-photo-picker-grid">
                    ${photos.map((photo) => {
                        const isSelected = selected.has(photo.id);
                        return `
                            <button class="album-photo-picker-card ${isSelected ? 'is-selected' : ''}" data-toggle-album-photo="${escapeHtml(photo.id)}" type="button" aria-pressed="${isSelected}">
                                <img src="${photo.url}" alt="${escapeHtml(photo.name)}">
                                <span>${escapeHtml(photo.name)}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            ` : `
                <button class="album-add-photos" id="btn-picker-upload-photos" type="button">
                    <span class="material-symbols-outlined">add_photo_alternate</span>
                    <strong>개별사진 저장소가 비어 있습니다</strong>
                    <small>먼저 사진을 업로드한 뒤 앨범에 추가할 수 있습니다.</small>
                </button>
            `}
        </section>
    `;
}

function renderTravelDraftSurfaces() {
    const draftPhotos = getDraftPhotos();
    const albumPhotos = getAlbumCandidatePhotos();
    const fallbackPhotoCount = getDraftPhotoCount({
        staged: state.stagedPhotos,
        saved: getMySavedPhotos(),
        demos: getDemoDraftPhotos()
    });
    const summary = getTravelSummary({
        draftPhotos,
        albumDrafts: state.albumDrafts,
        selectedAlbum: state.selectedPublicAlbumId ? getSelectedPublicAlbum() : null
    });
    const photoCount = summary.photoCount || fallbackPhotoCount;
    const albumLocatedPhotos = albumPhotos.filter(hasPhotoLocation);

    $('#analysis-title') && ($('#analysis-title').textContent = summary.title);
    $('#analysis-photo-count') && ($('#analysis-photo-count').textContent = String(albumPhotos.length));
    $('#analysis-place-count') && ($('#analysis-place-count').textContent = String(albumLocatedPhotos.length));
    $('#analysis-day-count') && ($('#analysis-day-count').textContent = formatDayCount(getTravelDaySummaries(albumPhotos).length));
    $('#review-day-one-count') && ($('#review-day-one-count').textContent = formatPhotoPlaceMeta(Math.min(photoCount, 18), summary.places));
    $('#share-title') && ($('#share-title').textContent = summary.title);
    $('#share-preview-title') && ($('#share-preview-title').textContent = summary.title);
    $('#share-date-range') && ($('#share-date-range').textContent = summary.dateRange);
    $('#share-trip-photo-count') && ($('#share-trip-photo-count').textContent = formatPhotoCount(photoCount));
    $('#share-preview-count') && ($('#share-preview-count').textContent = `공개 사진 ${summary.publicCount}장`);

    const reviewDayList = $('#review-day-list');
    if (reviewDayList) {
        const daySummaries = getTravelDaySummaries(draftPhotos);
        reviewDayList.innerHTML = daySummaries.length
            ? daySummaries.map((day) => `
                <article>
                    <span>${day.dayLabel}</span>
                    <strong>${day.title}</strong>
                    <small>${formatPhotoPlaceMeta(day.photoCount, day.places)}</small>
                </article>
            `).join('')
            : `
                <article>
                    <span>Draft</span>
                    <strong>날짜 정보가 있는 사진이 없습니다</strong>
                    <small>${formatPhotoPlaceMeta(photoCount, summary.places)}</small>
                </article>
            `;
    }

    const analysisStrip = $('#analysis-selected-strip');
    if (analysisStrip) {
        analysisStrip.innerHTML = draftPhotos.slice(0, 4).map((photo, index) => `
            <article>
                <img src="${photo.url}" alt="${escapeHtml(photo.name)}">
                <span>${index === 0 ? 'Cover' : index === 1 ? 'Route' : 'Photo'}</span>
            </article>
        `).join('');
    }

    const albumDayList = $('#album-day-photo-list');
    if (albumDayList) {
        const dayGroups = getAlbumPhotoDayGroups(albumPhotos);
        albumDayList.innerHTML = albumPhotos.length
            ? dayGroups.map((day) => `
                    <article>
                        <div>
                            <span>${day.label}</span>
                            <strong>${day.title}</strong>
                            <small>${formatPhotoPlaceMeta(day.photos.length, day.places)}</small>
                        </div>
                        <div class="album-day-thumbs">
                            ${day.photos.slice(0, 6).map((photo) => `
                                <figure>
                                    <button class="album-photo-remove" data-remove-album-photo="${escapeHtml(photo.id)}" type="button" aria-label="앨범에서 사진 제거">×</button>
                                    <img src="${photo.url}" alt="${escapeHtml(photo.name)}">
                                </figure>
                            `).join('')}
                        </div>
                    </article>
                `).join('')
            : '';
    }

    const albumMap = $('#album-map-frame');
    const albumPins = $('#album-map-pins');
    if (albumMap) {
        const center = albumLocatedPhotos[0] || { lat: 36.45, lng: 127.85 };
        const zoom = albumLocatedPhotos.length ? 9 : 7;
        albumMap.src = `https://www.google.com/maps?q=${center.lat},${center.lng}&z=${zoom}&output=embed`;
    }
    if (albumPins) {
        albumPins.innerHTML = albumLocatedPhotos.slice(0, 8).map((photo, index) => `
            <button class="album-map-pin pin-${index + 1}" type="button" data-open-photo-detail data-photo-id="${escapeHtml(photo.id || photo.localId)}">
                <img src="${photo.url}" alt="">
            </button>
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
    if (status) status.textContent = getVisibilityStatusText(state.visibility);
}

function applyShareSaveState() {
    const controlState = getShareSaveControlState(state.isSavingShare);
    const saveButton = $('#btn-save-share-settings');
    if (saveButton) {
        saveButton.disabled = controlState.disabled;
        saveButton.textContent = controlState.saveLabel;
    }
    $$('[data-visibility-shortcut]').forEach((button) => {
        button.disabled = controlState.disabled;
    });
}

async function saveShareSettings() {
    if (state.isSavingShare) return;
    if (!state.currentUser) {
        setPendingAuthAction(state, 'save-share');
        openModal('#auth-modal');
        showToast('공개 설정을 저장하려면 먼저 로그인해주세요.');
        return;
    }
    state.isSavingShare = true;
    applyShareSaveState();
    try {
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
    const shareTargetAlbumId = getShareTargetAlbumId(updatedAlbum, latestOwnAlbum);
    if (shareTargetAlbumId) state.selectedPublicAlbumId = shareTargetAlbumId;
    renderSavedPhotoSurfaces();
    renderPublicSurfaces();
    const message = state.visibility === 'public'
        ? '공개 여행으로 전환했습니다.'
        : state.visibility === 'link'
            ? '공유 링크 설정을 준비했습니다.'
            : '비공개 상태로 저장했습니다.';
    showToast(message);
    if (['public', 'link'].includes(state.visibility)) await copyCurrentShareLink();
    const completionHash = getShareCompletionHash(state.visibility, shareTargetAlbumId);
    if (completionHash !== '#/share') {
        window.location.hash = completionHash;
        renderRoute('trip');
    }
    } finally {
        state.isSavingShare = false;
        applyShareSaveState();
    }
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

function openMyphotoAlbum(albumRow) {
    const action = getMyphotoAlbumAction({
        albumId: albumRow.dataset.myphotoAlbumId || null,
        visibility: albumRow.dataset.myphotoAlbumVisibility || 'private',
        isDraft: albumRow.dataset.myphotoAlbumDraft === 'true'
    });

    if (action.albumId) state.selectedPublicAlbumId = action.albumId;
    if (action.route === 'trip') routeToTrip(action.albumId);
    else routeTo('album');
}

function startNewAlbum() {
    state.editingAlbumId = null;
    state.albumBuilderPhotoIds = [];
    state.albumPhotoPickerIds = [];
    state.visibility = 'private';
    routeTo('album');
}

function startEditSelectedAlbum() {
    const album = getSelectedPublicAlbum();
    if (!album || album.owner_id !== state.currentUser?.id) return;
    if (state.albumDetailEditMode) saveSelectedAlbumTextEdits();
    else {
        state.albumDetailEditMode = true;
        renderPublicSurfaces();
    }
}

async function saveSelectedAlbumTextEdits() {
    const album = getSelectedPublicAlbum();
    if (!album || album.owner_id !== state.currentUser?.id) return;
    const title = $('#trip-edit-title')?.value.trim();
    const note = $('#trip-edit-note')?.value.trim() || '';
    if (!title) {
        showToast('앨범 이름을 입력해주세요.');
        return;
    }
    const { data, error } = await updateAlbum(album.id, {
        title,
        note,
        visibility: album.visibility,
        cover_url: album.cover_url || null,
        photo_count: state.albumDetailPhotos.length || album.photo_count || 0
    });
    if (error) {
        showToast('앨범 정보를 저장하지 못했습니다.');
        return;
    }
    updateSavedAlbumLocally(album.id, normalizeSavedAlbum(data || { ...album, title, note }));
    state.savedPhotos = state.savedPhotos.map((photo) => (
        photo.album_id === album.id ? { ...photo, album: title } : photo
    ));
    state.albumDetailEditMode = false;
    renderSavedPhotoSurfaces();
    renderPublicSurfaces();
    showToast('앨범 정보를 저장했습니다.');
}

function openTripPhotoPicker() {
    const album = getSelectedPublicAlbum();
    if (!album || album.owner_id !== state.currentUser?.id) return;
    state.albumPhotoPickerReturnRoute = 'trip';
    state.albumPhotoPickerIds = mergeAlbumPhotoIds(state.albumDetailPhotos, []);
    routeTo('album-photos');
}

function updateSavedAlbumLocally(albumId, updates = {}) {
    state.savedAlbums = state.savedAlbums.map((album) => (
        album.id === albumId ? { ...album, ...updates } : album
    ));
}

async function toggleSelectedAlbumVisibility() {
    const album = getSelectedPublicAlbum();
    if (!album || album.owner_id !== state.currentUser?.id) return;
    const nextVisibility = album.visibility === 'public' ? 'private' : 'public';
    const { data, error } = await updateAlbumVisibility(album.id, nextVisibility);
    if (error) {
        showToast('앨범 공개 설정을 바꾸지 못했습니다.');
        return;
    }
    updateSavedAlbumLocally(album.id, normalizeSavedAlbum(data || { ...album, visibility: nextVisibility }));
    state.savedPhotos = state.savedPhotos.map((photo) => (
        photo.album_id === album.id
            ? { ...photo, visibility: nextVisibility, shared: nextVisibility === 'public' }
            : photo
    ));
    renderSavedPhotoSurfaces();
    renderPublicSurfaces();
    showToast(nextVisibility === 'public' ? '앨범을 공개로 전환했습니다.' : '앨범을 비공개로 전환했습니다.');
}

async function setSelectedAlbumCoverFromFirstPhoto() {
    const album = getSelectedPublicAlbum();
    if (!album || album.owner_id !== state.currentUser?.id) return;
    const coverPhoto = state.albumDetailPhotos[0] || album.photos?.[0];
    if (!coverPhoto?.url) {
        showToast('대표사진으로 설정할 사진이 없습니다.');
        return;
    }
    const { data, error } = await updateAlbum(album.id, {
        title: album.title,
        note: album.note,
        visibility: album.visibility,
        cover_url: coverPhoto.url,
        photo_count: state.albumDetailPhotos.length || album.photo_count || 0
    });
    if (error) {
        showToast('대표사진을 설정하지 못했습니다.');
        return;
    }
    updateSavedAlbumLocally(album.id, normalizeSavedAlbum(data || { ...album, cover_url: coverPhoto.url }));
    renderSavedPhotoSurfaces();
    renderPublicSurfaces();
    showToast('대표사진을 설정했습니다.');
}

async function deleteSelectedAlbum() {
    const album = getSelectedPublicAlbum();
    if (!album || album.owner_id !== state.currentUser?.id) return;
    if (!window.confirm(`'${album.title}' 앨범을 삭제할까요? 원본 사진은 삭제되지 않습니다.`)) return;
    const { error } = await deleteAlbum(album.id);
    if (error) {
        showToast('앨범을 삭제하지 못했습니다.');
        return;
    }
    state.savedAlbums = state.savedAlbums.filter((item) => item.id !== album.id);
    state.savedPhotos = state.savedPhotos.map((photo) => (
        photo.album_id === album.id ? { ...photo, album_id: null, album: null } : photo
    ));
    delete state.removedAlbumPhotoKeys[String(album.id)];
    state.selectedPublicAlbumId = state.savedAlbums.find((item) => item.owner_id === state.currentUser?.id)?.id || null;
    state.albumDetailEditMode = false;
    renderSavedPhotoSurfaces();
    routeTo(APP_SECTIONS.MYPHOTO);
    showToast('앨범을 삭제했습니다.');
}

async function addSelectedPhotosToTripAlbum() {
    const album = getSelectedPublicAlbum();
    if (!album || album.owner_id !== state.currentUser?.id) return;
    const selectedIds = mergeAlbumPhotoIds(state.albumDetailPhotos, state.albumPhotoPickerIds);
    const selectedPhotos = getMySavedPhotos().filter((photo) => selectedIds.includes(photo.id));
    const removedKeys = getRemovedAlbumPhotoKeys(album.id);
    selectedPhotos.forEach((photo) => {
        getAlbumPhotoRemovalKeys(photo).forEach((key) => removedKeys.delete(key));
    });
    state.removedAlbumPhotoKeys[String(album.id)] = [...removedKeys];
    const { error } = await replaceAlbumPhotos(album.id, selectedIds);
    if (error) {
        showToast('사진을 앨범에 추가하지 못했습니다.');
        return;
    }
    const cover = selectedPhotos[0]?.url || album.cover_url || null;
    const { data: updatedAlbum } = await updateAlbum(album.id, {
        title: album.title,
        note: album.note,
        visibility: album.visibility,
        cover_url: cover,
        photo_count: selectedIds.length
    });
    state.savedPhotos = state.savedPhotos.map((photo) => (
        selectedIds.includes(photo.id)
            ? { ...photo, album_id: album.id, album: album.title }
            : photo
    ));
    state.savedAlbums = state.savedAlbums.map((savedAlbum) => (
        savedAlbum.id === album.id
            ? normalizeSavedAlbum(updatedAlbum || { ...savedAlbum, cover_url: cover, photo_count: selectedIds.length })
            : savedAlbum
    ));
    state.albumPhotoPickerReturnRoute = null;
    state.albumDetailEditMode = true;
    renderSavedPhotoSurfaces();
    routeToTrip(album.id);
    showToast('사진을 앨범에 추가했습니다.');
}

async function removePhotoFromSelectedAlbum(photoId, photoIndex = null) {
    const album = getSelectedPublicAlbum();
    if (!album || album.owner_id !== state.currentUser?.id) return;
    const albumPhotos = album.photos?.length ? album.photos : state.albumDetailPhotos;
    const targetPhotoId = getAlbumPhotoRemovalTarget(albumPhotos, photoId, photoIndex);
    if (!targetPhotoId) {
        showToast('삭제할 사진을 찾지 못했습니다.');
        return;
    }
    const targetPhoto = albumPhotos.find((photo, index) => (
        String(photo.id || photo.localId || '') === String(targetPhotoId)
        || (String(index) === String(photoIndex))
    ));
    markAlbumPhotoRemoved(album.id, targetPhoto);
    state.albumDetailPhotos = albumPhotos.filter((photo) => !isAlbumPhotoRemoved(album.id, photo));
    const nextPhotoIds = getAlbumPhotoIdsAfterRemoval(albumPhotos, targetPhotoId, photoIndex);
    if (nextPhotoIds.length === albumPhotos.length) {
        showToast('삭제할 사진을 찾지 못했습니다.');
        return;
    }
    const cover = albumPhotos.find((photo) => String(photo.id || photo.localId) !== String(targetPhotoId))?.url || null;
    const { error } = await replaceAlbumPhotos(album.id, nextPhotoIds);
    if (error) {
        showToast('사진을 앨범에서 삭제하지 못했습니다.');
        return;
    }
    const { data: detachedPhotos, error: detachError } = await detachPhotosFromAlbum([targetPhotoId]);
    if (detachError) {
        showToast('사진을 앨범에서 삭제하지 못했습니다.');
        return;
    }
    const { data: updatedAlbum } = await updateAlbum(album.id, {
        title: album.title,
        note: album.note,
        visibility: album.visibility,
        cover_url: cover,
        photo_count: nextPhotoIds.length
    });

    const normalizedDetached = (detachedPhotos || []).map(normalizeSavedPhoto);
    state.savedPhotos = state.savedPhotos.map((photo) => (
        normalizedDetached.find((next) => next.id === photo.id)
        || (String(photo.id) === String(targetPhotoId) ? { ...photo, album_id: null, album: null } : photo)
    ));
    state.savedAlbums = state.savedAlbums.map((savedAlbum) => (
        savedAlbum.id === album.id
            ? normalizeSavedAlbum(updatedAlbum || {
                ...savedAlbum,
                photo_count: nextPhotoIds.length,
                cover_url: cover
            })
            : savedAlbum
    ));
    renderSavedPhotoSurfaces();
    renderPublicSurfaces();
    showToast('사진을 앨범에서 삭제했습니다.');
}

function renderAlbumDrafts() {
    const list = $('#album-list');
    const summary = $('#myphoto-summary');
    if (summary) summary.textContent = `${formatPhotoCount(state.stagedPhotos.length)} · ${formatAlbumCount(state.albumDrafts.length)}`;
    if (!list) return;

    if (!state.albumDrafts.length) {
        list.innerHTML = `
            <article class="album-row" role="button" tabindex="0" data-myphoto-album-draft="true">
                <img src="images/main_bg2.jpg" alt="">
                <div>
                    <span class="status-line"><span class="material-symbols-outlined">lock</span> 비공개 · 2026.05.12 - 05.16</span>
                    <strong>제주 4박 5일</strong>
                    <p>사진을 업로드하거나 앨범 초안을 저장하면 이곳에 실제 앨범이 표시됩니다.</p>
                    <small>128장 · 보관중</small>
                </div>
            </article>
            <article class="album-row" role="button" tabindex="0" data-myphoto-album-draft="true">
                <img src="images/main_bg5.jpg" alt="">
                <div>
                    <span class="status-line"><span class="material-symbols-outlined">lock</span> 비공개 · 2026.04.20 - 04.22</span>
                    <strong>동해 새벽 여행</strong>
                    <p>공개 전까지는 Myphoto에서만 확인할 수 있는 개인 여행 기록입니다.</p>
                    <small>42장 · 보관중</small>
                </div>
            </article>
        `;
        return;
    }

    list.innerHTML = state.albumDrafts.map((album) => `
        <article class="album-row" role="button" tabindex="0" data-myphoto-album-draft="true">
            <img src="images/main_bg4.jpg" alt="">
            <div>
                <span class="status-line"><span class="material-symbols-outlined">lock</span> 비공개 · 방금 생성</span>
                <strong>${escapeHtml(album.name)}</strong>
                <p>${escapeHtml(album.note || '비공개 앨범 초안입니다.')}</p>
                <small>${formatPhotoCount(state.stagedPhotos.length)} · 초안</small>
            </div>
        </article>
    `).join('');
}

function handlePhotoFiles(files) {
    const { accepted: selected, rejected } = filterAcceptedPhotoFiles(files || []);
    if (rejected.length) {
        const message = rejected.length === 1
            ? `${rejected[0].file.name}: ${rejected[0].reason}`
            : `${rejected.length}개의 파일을 제외했습니다. JPG, PNG, WebP와 15MB 이하 사진만 올릴 수 있습니다.`;
        showToast(message);
    }
    if (!selected.length) return;
    const uploadBatchId = Date.now();
    state.stagedPhotos = appendUploadPhotos(state.stagedPhotos, selected, {
        createLocalId: (file, index) => `${uploadBatchId}-${index}-${Math.random().toString(36).slice(2)}`,
        createObjectUrl: (file) => URL.createObjectURL(file)
    });
    renderStagedPhotos();
    routeTo('upload');
    closeModals();
    showToast(`${selected.length}장의 사진을 업로드 초안에 추가했습니다.`);
}

function bindPhotoInput() {
    $('#photo-input')?.addEventListener('click', (event) => {
        event.stopPropagation();
    });
    $('#photo-input')?.addEventListener('change', (event) => {
        handlePhotoFiles(event.target.files);
        event.target.value = '';
    });
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
    const selectedPhotos = getSelectedUploadPhotos(state.stagedPhotos);
    if (!selectedPhotos.length) {
        routeTo(getUploadNextRoute(0));
        showToast('사진을 먼저 선택해주세요.');
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
        for (const [index, photo] of selectedPhotos.entries()) {
            const id = `${timestamp}-${index}`;
            const fileName = `${state.currentUser.id}/${id}-${safeFileName(photo.name)}`;
            const exif = await readPhotoExif(photo.file);
            const hasExifLocation = hasUsableCoordinates(exif.lat, exif.lng);
            const { url, error: uploadError } = await uploadImage(photo.file, fileName);
            if (uploadError) throw uploadError;
            const record = {
                id,
                url,
                date: exif.date || new Date().toISOString(),
                title: photo.name,
                description: '',
                lat: hasExifLocation ? exif.lat : null,
                lng: hasExifLocation ? exif.lng : null,
                liked: 0,
                shared: false,
                owner_id: state.currentUser.id,
                album: $('#album-name-input')?.value.trim() || '업로드 초안',
                visibility: 'private',
                geo_source: hasExifLocation ? 'exif' : 'unknown'
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
        if (status) status.textContent = `${saved.length}장의 사진을 개별사진 보관함에 저장했습니다.`;
        showToast(`${saved.length}장의 사진을 저장했습니다.`);
        clearUploadQueue();
        routeTo(getUploadNextRoute(saved.length));
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
        const draftPhotoIds = getSharePhotoIds();
        const { data: album, error } = await createAlbum({
            owner_id: state.currentUser.id,
            title: name,
            note: localDraft.note,
            visibility: state.visibility,
            cover_url: draftPhotos[0]?.url || null,
            photo_count: draftPhotoIds.length || draftPhotos.length
        });
        if (error) {
            showToast('앨범 초안은 화면에 만들었지만 DB 저장에 실패했습니다.');
        } else if (album) {
            const savedAlbum = normalizeSavedAlbum(album);
            state.savedAlbums.unshift(savedAlbum);
            state.selectedPublicAlbumId = savedAlbum.id;
            if (draftPhotoIds.length) await attachPhotosToAlbum(album.id, draftPhotoIds);
            await loadPublicProfileNames();
        }
    }

    nameInput.value = '';
    if (noteInput) noteInput.value = '';
    renderAlbumDrafts();
    renderSavedPhotoSurfaces();
    showToast('앨범 초안을 만들었습니다.');
}

function getSharePhotoIds() {
    return getTravelDraftPhotoIds({
        lastSavedPhotoIds: state.lastSavedPhotoIds,
        saved: getMySavedPhotos()
    });
}

async function saveAlbumAndOpenDetail() {
    const nameInput = $('#album-name-input');
    const noteInput = $('#album-note-input');
    const name = nameInput?.value.trim();
    if (!name) {
        showToast('앨범 이름을 입력해주세요.');
        nameInput?.focus();
        return;
    }
    if (!state.currentUser) {
        setPendingAuthAction(state, 'save-album');
        openModal('#auth-modal');
        showToast('앨범을 저장하려면 먼저 로그인해주세요.');
        return;
    }

    const note = noteInput?.value.trim() || '';
    const draftPhotos = getAlbumCandidatePhotos();
    const draftPhotoIds = [...state.albumBuilderPhotoIds];
    const editingAlbumId = state.editingAlbumId;
    const payload = {
        owner_id: state.currentUser.id,
        title: name,
        note,
        visibility: state.visibility,
        cover_url: draftPhotos[0]?.url || null,
        photo_count: draftPhotoIds.length
    };
    const result = editingAlbumId
        ? await updateAlbum(editingAlbumId, payload)
        : await createAlbum(payload);
    const { data: album, error } = result;

    if (error || !album) {
        showToast('앨범 저장에 실패했습니다.');
        return;
    }

    const savedAlbum = normalizeSavedAlbum(album);
    state.savedAlbums = [
        savedAlbum,
        ...state.savedAlbums.filter((albumItem) => albumItem.id !== savedAlbum.id)
    ];
    state.selectedPublicAlbumId = savedAlbum.id;
    {
        await replaceAlbumPhotos(savedAlbum.id, draftPhotoIds);
        const selectedPhotoIds = new Set(draftPhotoIds);
        state.savedPhotos = state.savedPhotos.map((photo) => {
            if (photo.album_id === savedAlbum.id && !selectedPhotoIds.has(photo.id)) {
                return { ...photo, album_id: null };
            }
            if (selectedPhotoIds.has(photo.id)) {
                return { ...photo, album_id: savedAlbum.id, album: savedAlbum.title };
            }
            return photo;
        });
        const { data: updatedPhotos } = await updatePhotosVisibility(draftPhotoIds, state.visibility);
        if (updatedPhotos?.length) {
            const normalized = updatedPhotos.map(normalizeSavedPhoto);
            state.savedPhotos = state.savedPhotos.map((photo) => normalized.find((next) => next.id === photo.id) || photo);
        }
    }
    state.editingAlbumId = null;
    await loadPublicProfileNames();
    renderSavedPhotoSurfaces();
    renderPublicSurfaces();
    showToast('앨범을 저장했습니다.');
    routeToTrip(savedAlbum.id);
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
    const { name, note } = getDraftAlbumInput();
    const existingAlbum = selectAlbumForSharing(state.savedAlbums, state.currentUser.id, name);
    if (existingAlbum) return existingAlbum;

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
    await loadPublicProfileNames();
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
    const nameInput = $('#photo-title-input');
    const descriptionInput = $('#photo-description-input');
    const dateInput = $('#photo-date-input');
    const mapFrame = $('#location-editor-map-frame');
    const message = $('#location-editor-message');
    const title = $('#location-selected-photo-title');
    const draft = normalizeLocationDraft(photo);

    state.selectedLocationPhotoId = photo?.id || null;
    if (latInput) latInput.value = draft.lat;
    if (lngInput) lngInput.value = draft.lng;
    if (nameInput) nameInput.value = photo?.name || '';
    if (descriptionInput) descriptionInput.value = photo?.description || '';
    if (dateInput) dateInput.value = formatPhotoDateInput(photo?.date);
    if (mapFrame) mapFrame.src = getPhotoMapUrl({ lat: draft.lat, lng: draft.lng }, 13);
    state.editingPhotoVisibility = photo?.visibility === 'public' || photo?.shared ? 'public' : 'private';
    $$('[data-photo-visibility]').forEach((button) => {
        button.classList.toggle('active', button.dataset.photoVisibility === state.editingPhotoVisibility);
    });
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

function syncLocationEditorMap() {
    const lat = Number($('#location-lat-input')?.value);
    const lng = Number($('#location-lng-input')?.value);
    const mapFrame = $('#location-editor-map-frame');
    if (!mapFrame || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    mapFrame.src = getPhotoMapUrl({ lat, lng }, 13);
}

async function saveManualLocation(event) {
    event.preventDefault();
    const lat = Number($('#location-lat-input')?.value);
    const lng = Number($('#location-lng-input')?.value);
    const title = $('#photo-title-input')?.value.trim() || '';
    const description = $('#photo-description-input')?.value.trim() || '';
    const dateValue = $('#photo-date-input')?.value;
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
    const { data, error } = await updatePhotoInfo(photo.id, {
        title: title || photo.name,
        description,
        date: dateValue ? new Date(dateValue).toISOString() : photo.date,
        lat,
        lng,
        visibility: state.editingPhotoVisibility,
        geo_source: 'manual'
    });
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
    updatePhotoDetailModal(updated);
    closeModals();
    showToast('사진 위치를 저장했습니다.');
}

async function searchExploreMap(event) {
    event.preventDefault();
    const input = $('#explore-map-search-input');
    const query = input?.value.trim();
    const map = await ensureExploreMap();
    const maps = window.google?.maps;
    if (!query || !map || !maps) return;

    const service = new maps.places.PlacesService(map);
    service.findPlaceFromQuery({
        query,
        fields: ['name', 'geometry']
    }, (results, status) => {
        if (status !== maps.places.PlacesServiceStatus.OK || !results?.[0]?.geometry?.location) {
            showToast('검색 결과를 찾지 못했습니다.');
            return;
        }
        map.panTo(results[0].geometry.location);
        map.setZoom(13);
    });
}

function renderExploreList() {
    renderPublicSurfaces();
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
        visibility: state.visibility,
        albumId: state.selectedPublicAlbumId
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
    if (action === 'save-album') {
        await saveAlbumAndOpenDetail();
        return;
    }
    if (action === 'save-share') await saveShareSettings();
}

function bindEvents() {
    $$('[data-route]').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            routeTo(link.dataset.route);
        });
    });
    $$('[data-mobile-route]').forEach((button) => button.addEventListener('click', () => routeTo(button.dataset.mobileRoute)));
    $('#btn-home-myphoto')?.addEventListener('click', () => routeTo(APP_SECTIONS.MYPHOTO));
    $('#btn-home-explore')?.addEventListener('click', () => routeTo(APP_SECTIONS.EXPLORE));
    $('#btn-open-upload')?.addEventListener('click', () => routeTo('upload'));
    $('#btn-open-photos')?.addEventListener('click', () => routeTo('photos'));
    $('#btn-upload-more-photos')?.addEventListener('click', () => routeTo('upload'));
    $('#btn-delete-selected-photos')?.addEventListener('click', deleteSelectedPersonalPhotos);
    $('#btn-open-album')?.addEventListener('click', startNewAlbum);
    $('#btn-open-album-inline')?.addEventListener('click', startNewAlbum);
    $$('[data-go-myphoto]').forEach((button) => button.addEventListener('click', () => routeTo(APP_SECTIONS.MYPHOTO)));
    $$('[data-go-album]').forEach((button) => button.addEventListener('click', () => routeTo('album')));
    $$('[data-go-trip]').forEach((button) => {
        button.addEventListener('click', () => routeToTrip(button.dataset.publicAlbumId));
    });
    $$('[data-go-profile]').forEach((button) => {
        button.addEventListener('click', () => routeToPublic('profile', button.dataset.publicAlbumId));
    });
    $$('[data-open-photo-detail]').forEach((button) => button.addEventListener('click', () => {
        updatePhotoDetailModal(getDefaultDetailPhoto());
        openModal('#photo-detail-modal');
    }));
    document.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) return;

        const routeButton = event.target.closest('[data-route]');
        if (routeButton) {
            event.preventDefault();
            routeTo(routeButton.dataset.route);
            return;
        }

        const goMyphotoButton = event.target.closest('[data-go-myphoto]');
        if (goMyphotoButton) {
            routeTo(APP_SECTIONS.MYPHOTO);
            return;
        }

        const goAlbumButton = event.target.closest('[data-go-album]');
        if (goAlbumButton) {
            routeTo('album');
            return;
        }

        const editAlbumButton = event.target.closest('#btn-edit-album');
        if (editAlbumButton) {
            startEditSelectedAlbum();
            return;
        }

        const addTripPhotosButton = event.target.closest('#btn-add-trip-photos');
        if (addTripPhotosButton) {
            openTripPhotoPicker();
            return;
        }

        const toggleAlbumVisibilityButton = event.target.closest('#btn-toggle-album-visibility');
        if (toggleAlbumVisibilityButton) {
            toggleSelectedAlbumVisibility();
            return;
        }

        const setAlbumCoverButton = event.target.closest('#btn-set-album-cover');
        if (setAlbumCoverButton) {
            setSelectedAlbumCoverFromFirstPhoto();
            return;
        }

        const deleteAlbumButton = event.target.closest('#btn-delete-album');
        if (deleteAlbumButton) {
            deleteSelectedAlbum();
            return;
        }

        const removeTripPhotoButton = event.target.closest('[data-remove-trip-photo]');
        if (removeTripPhotoButton) {
            event.preventDefault();
            event.stopPropagation();
            removePhotoFromSelectedAlbum(
                removeTripPhotoButton.dataset.removeTripPhoto,
                removeTripPhotoButton.dataset.removeTripPhotoIndex
            );
            return;
        }

        const openAlbumPhotoPickerButton = event.target.closest('#btn-open-album-photo-picker');
        if (openAlbumPhotoPickerButton) {
            state.albumPhotoPickerReturnRoute = null;
            state.albumPhotoPickerIds = [...state.albumBuilderPhotoIds];
            routeTo('album-photos');
            return;
        }

        const toggleAlbumPhotoButton = event.target.closest('[data-toggle-album-photo]');
        if (toggleAlbumPhotoButton) {
            state.albumPhotoPickerIds = togglePersonalPhotoSelection(
                state.albumPhotoPickerIds,
                toggleAlbumPhotoButton.dataset.toggleAlbumPhoto
            );
            renderAlbumPhotoPickerPage();
            return;
        }

        const addSelectedAlbumPhotosButton = event.target.closest('#btn-add-selected-album-photos');
        if (addSelectedAlbumPhotosButton) {
            if (state.albumPhotoPickerReturnRoute === 'trip') {
                addSelectedPhotosToTripAlbum();
                return;
            }
            state.albumBuilderPhotoIds = [...state.albumPhotoPickerIds];
            routeTo('album');
            return;
        }

        const removeAlbumPhotoButton = event.target.closest('[data-remove-album-photo]');
        if (removeAlbumPhotoButton) {
            state.albumBuilderPhotoIds = state.albumBuilderPhotoIds.filter((id) => id !== removeAlbumPhotoButton.dataset.removeAlbumPhoto);
            state.albumPhotoPickerIds = state.albumPhotoPickerIds.filter((id) => id !== removeAlbumPhotoButton.dataset.removeAlbumPhoto);
            renderTravelDraftSurfaces();
            return;
        }

        const pickerUploadButton = event.target.closest('#btn-picker-upload-photos');
        if (pickerUploadButton) {
            routeTo('upload');
            return;
        }

        const copyTripLinkButton = event.target.closest('#btn-copy-trip-link');
        if (copyTripLinkButton) {
            copyCurrentShareLink();
            return;
        }

        const goProfileButton = event.target.closest('[data-go-profile]');
        if (goProfileButton) {
            routeToPublic('profile', goProfileButton.dataset.publicAlbumId);
            return;
        }

        const visibilityButton = event.target.closest('[data-visibility]');
        if (visibilityButton) {
            setVisibilityMode(visibilityButton.dataset.visibility);
            return;
        }

        const photoVisibilityButton = event.target.closest('[data-photo-visibility]');
        if (photoVisibilityButton) {
            state.editingPhotoVisibility = photoVisibilityButton.dataset.photoVisibility === 'public' ? 'public' : 'private';
            $$('[data-photo-visibility]').forEach((button) => {
                button.classList.toggle('active', button === photoVisibilityButton);
            });
            return;
        }

        const saveAlbumButton = event.target.closest('#btn-save-album-draft');
        if (saveAlbumButton) {
            saveAlbumAndOpenDetail();
            return;
        }

        const personalPhotoToggle = event.target.closest('[data-toggle-personal-photo]');
        if (personalPhotoToggle) {
            event.preventDefault();
            event.stopPropagation();
            state.selectedPersonalPhotoIds = togglePersonalPhotoSelection(
                state.selectedPersonalPhotoIds,
                personalPhotoToggle.dataset.togglePersonalPhoto
            );
            renderPersonalPhotosPage();
            return;
        }

        const albumRow = event.target.closest('[data-myphoto-album-id], [data-myphoto-album-name], [data-myphoto-album-draft]');
        if (albumRow) {
            openMyphotoAlbum(albumRow);
            return;
        }

        const photoCard = event.target.closest('[data-open-photo-detail][data-photo-id]');
        if (photoCard) {
            const photo = getAllDisplayPhotos().find((candidate) => candidate.id === photoCard.dataset.photoId);
            updatePhotoDetailModal(photo || getDefaultDetailPhoto());
            openModal('#photo-detail-modal');
            return;
        }

        const photoDetailButton = event.target.closest('[data-open-photo-detail]');
        if (photoDetailButton) {
            updatePhotoDetailModal(getDefaultDetailPhoto());
            openModal('#photo-detail-modal');
            return;
        }

        const locationButton = event.target.closest('[data-open-photo-editor]');
        if (locationButton) {
            openLocationEditor({ currentTarget: locationButton });
            return;
        }

        const photoEditorButton = event.target.closest('#btn-expand-photo-map');
        if (photoEditorButton) {
            openLocationEditor({ currentTarget: photoEditorButton });
            return;
        }

        const explorePhotoPin = event.target.closest('[data-explore-photo-pin]');
        if (explorePhotoPin) {
            const photo = getLocatedPublicPhotos().find((candidate) => candidate.id === explorePhotoPin.dataset.explorePhotoPin);
            if (photo?.album_id) setSelectedPublicAlbum(photo.album_id);
            updateExplorePhotoPreview(photo);
            renderPublicSurfaces();
            updateExplorePhotoPreview(photo);
            document.body.classList.add('explore-pin-selected');
            $('#explore-pin-preview')?.removeAttribute('hidden');
            return;
        }

        const selectorButton = event.target.closest('[data-select-location-photo]');
        if (selectorButton) setLocationEditorPhoto(selectorButton.dataset.selectLocationPhoto);
    });
    document.addEventListener('keydown', (event) => {
        if (!['Enter', ' '].includes(event.key) || !(event.target instanceof Element)) return;
        const albumRow = event.target.closest('[data-myphoto-album-id], [data-myphoto-album-name], [data-myphoto-album-draft]');
        if (!albumRow) return;
        event.preventDefault();
        openMyphotoAlbum(albumRow);
    });
    $('#btn-close-pin-preview')?.addEventListener('click', () => {
        document.body.classList.remove('explore-pin-selected');
        $('#explore-pin-preview')?.setAttribute('hidden', '');
    });
    $$('[data-visibility]').forEach((button) => button.addEventListener('click', () => setVisibilityMode(button.dataset.visibility)));
    $$('[data-visibility-shortcut]').forEach((button) => {
        button.addEventListener('click', async () => {
            const action = getVisibilityShortcutAction(button.dataset.visibilityShortcut);
            setVisibilityMode(action.visibility);
            if (action.shouldSave) await saveShareSettings();
        });
    });
    $('#btn-save-share-settings')?.addEventListener('click', saveShareSettings);
    $$('[data-profile-tab]').forEach((button) => button.addEventListener('click', () => setProfileTab(button.dataset.profileTab)));
    $('#btn-copy-share-link')?.addEventListener('click', copyCurrentShareLink);
    $('#btn-copy-trip-link')?.addEventListener('click', copyCurrentShareLink);
    $('#btn-review-upload')?.addEventListener('click', persistStagedPhotos);
    $('#btn-clear-staged')?.addEventListener('click', () => {
        state.stagedPhotos.forEach((photo) => URL.revokeObjectURL(photo.url));
        state.stagedPhotos = [];
        renderStagedPhotos();
        showToast('업로드 초안을 비웠습니다.');
    });
    $('#btn-save-album-draft')?.addEventListener('click', saveAlbumAndOpenDetail);
    bindPhotoInput();
    const uploadDropzone = $('#upload-dropzone');
    if (uploadDropzone) {
        uploadDropzone.addEventListener('click', (event) => {
            if (event.target instanceof HTMLInputElement) return;
            const thumbnail = event.target instanceof Element ? event.target.closest('[data-upload-photo-id]') : null;
            if (thumbnail) {
                state.stagedPhotos = toggleUploadPhotoSelection(state.stagedPhotos, thumbnail.dataset.uploadPhotoId);
                renderStagedPhotos();
                return;
            }
            $('#photo-input')?.click();
        });
        uploadDropzone.addEventListener('keydown', (event) => {
            if (event.target instanceof Element && event.target.closest('[data-upload-photo-id]')) return;
            if (!['Enter', ' '].includes(event.key)) return;
            event.preventDefault();
            $('#photo-input')?.click();
        });
        uploadDropzone.addEventListener('dragstart', (event) => {
            if (event.target instanceof Element && event.target.closest('[data-upload-photo-id]')) {
                event.preventDefault();
            }
        });
        ['dragenter', 'dragover'].forEach((eventName) => {
            uploadDropzone.addEventListener(eventName, (event) => {
                event.preventDefault();
                uploadDropzone.className = getUploadDropzoneClass(true);
            });
        });
        ['dragleave', 'drop'].forEach((eventName) => {
            uploadDropzone.addEventListener(eventName, (event) => {
                event.preventDefault();
                uploadDropzone.className = getUploadDropzoneClass(false);
            });
        });
        uploadDropzone.addEventListener('drop', (event) => {
            const droppedFiles = getDroppedFiles(event.dataTransfer);
            if (droppedFiles.length) handlePhotoFiles(droppedFiles);
        });
    }
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
    $('#explore-map-search')?.addEventListener('submit', searchExploreMap);
    $('#location-lat-input')?.addEventListener('change', syncLocationEditorMap);
    $('#location-lng-input')?.addEventListener('change', syncLocationEditorMap);
    $('#location-editor-form')?.addEventListener('submit', saveManualLocation);
    $$('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModals));
    $$('.modal').forEach((modal) => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeModals();
        });
    });
    window.addEventListener('hashchange', () => applyRouteHash(window.location.hash));
}

document.addEventListener('DOMContentLoaded', async () => {
    const restoredAuthContext = restorePendingAuthContext(window.sessionStorage, state);
    if (restoredAuthContext?.visibility) state.visibility = restoredAuthContext.visibility;
    if (restoredAuthContext?.albumId) state.selectedPublicAlbumId = restoredAuthContext.albumId;
    const sharedAlbumId = parseSharedAlbumId(window.location.hash);
    if (sharedAlbumId) state.selectedPublicAlbumId = sharedAlbumId;
    state.currentUser = await getCurrentUser();
    updateAccountUI();
    await loadSavedPhotos();
    await loadSavedAlbums();
    await loadPublicProfileNames();
    bindEvents();
    renderStagedPhotos();
    renderSavedPhotoSurfaces();
    renderTravelDraftSurfaces();
    renderExploreList();
    setVisibilityMode(state.visibility);
    setProfileTab(state.profileTab);
    if (restoredAuthContext?.route) routeTo(restoredAuthContext.route, { replace: !window.location.hash });
    else applyRouteHash(window.location.hash, { replace: !window.location.hash });
    if (state.currentUser) await runPendingAuthAction();
});
