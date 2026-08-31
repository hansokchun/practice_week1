import {
    attachPhotosToAlbum,
    createAlbum,
    deleteAlbum,
    deleteLandingSection,
    detachPhotosFromAlbum,
    fetchAlbums,
    fetchLandingCuration,
    fetchMyLikes,
    fetchPhotos,
    fetchProfilesByIds,
    hydratePhotoUrls,
    getCurrentUser,
    deleteCurrentAccount,
    resetPasswordForEmail,
    signInWithEmail,
    signOut,
    signUpWithEmail,
    signInWithGoogle,
    signInWithKakao,
    setPhotoLike,
    updatePassword,
    updateUserMetadata,
    updateProfileInDB,
    updatePhotoInfo,
    updatePhotosVisibility,
    uploadImage,
    updateAlbum,
    updateAlbumVisibility,
    deletePhoto,
    replaceAlbumPhotos,
    removeUploadedImage,
    requestPhotoAiAnalysis,
    saveLandingSection,
    upsertPhoto
} from '../auth.js';
import { getAccountDeletionControlState } from './account-deletion.mjs';
import {
    getProviderAccountProfile,
    resolveAccountProfile
} from './account-profile.mjs';
import { buildAccountNotificationItems } from './account-notifications.mjs';
import { selectAlbumForSharing } from './album-sharing-selection.mjs';
import { getPhotoPage } from './photo-pagination.mjs';
import { isVerifiedAccount } from './account-verification.mjs';
import { APP_SECTIONS, normalizeAppSection, parseSectionHash } from './app-sections.mjs';
import { getDroppedFiles, getUploadDropzoneClass } from './drag-drop-files.mjs';
import { getExplorePreviewExpansionAction } from './explore-preview-expansion.mjs';
import { shouldOpenExplorePreview } from './explore-selection.mjs';
import {
    getLocationEditorPhoto,
    getMissingLocationPhotos,
    normalizeLocationDraft
} from './location-workflow.mjs';
import { getLocationEditorMapOptions } from './location-editor-map-options.mjs';
import { getGoogleMapsLocationUrl } from './location-copy.mjs';
import { loadKakaoShareSdk, sendKakaoShare } from './kakao-share.mjs';
import {
    normalizeGoogleMapsRuntimeConfig,
    withGoogleMapsMapId
} from './google-maps-runtime-config.mjs';
import { createGoogleMapsMarker } from './google-maps-marker.mjs';
import { mountGoogleMapsPlaceAutocomplete } from './google-maps-place-autocomplete.mjs';
import { hasUsableCoordinates, hasUsablePhotoLocation } from './photo-location.mjs';
import {
    getPhotoDetailMapViewport,
    getPhotoDetailOwnerMapItems
} from './photo-detail-map.mjs';
import { applyPhotoUrlsToAlbumCovers } from './photo-storage.mjs';
import { getMyphotoAlbumAction } from './myphoto-album-action.mjs';
import { getNewAccountLimitMessage, getNewAccountLimitStatus } from './new-account-limits.mjs';
import {
    restorePendingAuthContext,
    setPendingAuthAction,
    storePendingAuthContext,
    takePendingAuthAction
} from './pending-auth-action.mjs';
import { filterAcceptedPhotoFiles, validatePhotoFile } from './photo-file-validation.mjs';
import { readPhotoExif } from './photo-exif-reader.mjs';
import { optimizePhotoForUpload, shouldOptimizePhotoForUpload } from './photo-upload-optimizer.mjs';
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
import {
    getPublicOwnerProfileMapPhotos,
    getPublicOwnerProfilePhotos
} from './public-owner-profile-photos.mjs';
import { getProfileDisplayName, getProfileUserId, normalizeNickname } from './profile-names.mjs';
import { formatRelativeTime } from './relative-time.mjs';
import { formatMissingLocationSummary, getMyphotoStats } from './myphoto-stats.mjs';
import { getShareCompletionHash, getShareTargetAlbumId } from './share-completion.mjs';
import { buildAlbumRouteHash, buildOwnerProfileHash, buildTripHash, buildTripShareUrl, getSharedRouteState, getShareUrlAlbumId, parseSharedAlbumId } from './share-link.mjs';
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
import defaultProfileAvatarUrl from '../images/default-profile-avatar.png';
import {
    MAIN_BG_1_URL,
    MAIN_BG_2_URL,
    MAIN_BG_3_URL,
    MAIN_BG_4_URL,
    MAIN_BG_5_URL
} from './image-assets.mjs';
import {
    getAccountUploadLimitMessage,
    getAccountUploadLimitStatus
} from './upload-account-limit.mjs';
import {
    appendUploadPhotos,
    countSelectedUploadPhotos,
    getSelectedUploadPhotos,
    shouldClearUploadQueue,
    toggleUploadPhotoSelection
} from './upload-photo-selection.mjs';
import { getAuthRequiredRoute, takePendingAuthRoute } from './auth-route-guard.mjs';
import { calculateAlbumReviewRowLayout, getAlbumReviewDaySections, packAlbumReviewRowsForWidth } from './album-review-layout.mjs';
import {
    getAlbumPhotoIdsAfterRemoval,
    getAlbumPhotoRemovalTarget,
    mergeAlbumPhotoIds,
    shouldOpenAlbumDetailPhotoClick
} from './album-detail-edit-state.mjs';
import {
    getExploreMarkerClusters,
    getExploreMarkerExpansionViewport,
    getExploreViewportAction
} from './explore-marker-clusters.mjs';
import { animateExploreMapCamera } from './explore-map-camera.mjs';
import {
    getExploreMapFitPadding,
    getExploreMapFocusPanY,
    getExploreMapPreviewFocusPanY
} from './explore-mobile-viewport.mjs';
import {
    getEmbeddedOAuthBrowserMessage,
    isLikelyEmbeddedOAuthBrowser
} from './mobile-oauth-browser.mjs';
import { getOAuthRedirectUrl } from './oauth-redirect-url.mjs';
import {
    getOAuthIdentityProfile,
    mergeOAuthIdentityProfile,
    setPendingOAuthProvider,
    takePendingOAuthProvider
} from './oauth-profile-import.mjs';
import { getExploreMapOptions } from './explore-map-options.mjs';
import { getExplorePinSymbolIcon } from './explore-pin-icon.mjs';
import { getStreetViewStaticImageUrl } from './street-view-static.mjs';
import {
    getExploreDiscoveryPhotos,
    normalizeExploreBounds,
    shouldPreserveExploreViewport
} from './explore-discovery-panel.mjs';
import {
    formatDayCount,
    formatPhotoCount,
    formatPhotoPlaceMeta,
    formatPlaceCount
} from './copy-formatters.mjs';
import { getPublicDemoAlbumEntries, getPublicDemoAlbums, getPublicDemoPhotos } from './public-demo-data.mjs';
import { combinePublicAlbumsWithDemoEntries } from './public-album-entries.mjs';
import { getPublicSurfaceAlbums } from './public-surface-albums.mjs';
import {
    canShowPhotoInExploreScope,
    canShowPhotoOnPublicMap,
    normalizeLocationPrecision
} from './photo-location-privacy.mjs';
import {
    getLibraryFailureState,
    getMapUnavailableState,
    getUploadFailureState
} from './user-facing-failure-states.mjs';
import { isPasswordRecoveryCallback } from './password-recovery.mjs';
import {
    LANDING_SECTION_BATCH_SIZE,
    getDefaultLandingSections,
    getLandingSearchResults,
    getLandingSectionPhotos,
    getLandingVisiblePhotos,
    isLandingAdmin,
    normalizeLandingSections
} from './landing-sections.mjs';
import {
    LANDING_SLIDE_INTERVAL_MS,
    getNextLandingSlideIndex
} from './landing-slideshow.mjs';
import {
    buildLandingTagHash,
    canOpenLandingTagPage,
    parseLandingTagId
} from './landing-tag-route.mjs';
import {
    LANDING_TAG_PIN_LIMIT,
    filterLandingTagPhotosByRegion,
    getLandingTagFeedPhotos,
    getLandingTagPhotoPage,
    getLandingTagRegions
} from './landing-tag-feed.mjs';

const initialAuthHash = window.location.hash;

const state = {
    currentUser: null,
    authMode: 'login',
    stagedPhotos: [],
    savedPhotos: [],
    savedAlbums: [],
    likedPhotoIds: [],
    hasLoadedSavedPhotos: false,
    isSavedLibraryLoading: true,
    hasLoadedMyLikes: false,
    hasLoadedSavedAlbums: false,
    savedPhotosLoadError: false,
    savedAlbumsLoadError: false,
    myLikesLoadError: false,
    profileNames: {},
    publicProfiles: {},
    pendingKakaoProfile: null,
    lastSavedPhotoIds: [],
    albumDrafts: [],
    visibility: 'private',
    profileTab: 'map',
    selectedPublicAlbumId: null,
    selectedPublicOwnerId: null,
    selectedPhotoId: null,
    selectedPersonalPhotoIds: [],
    personalPhotoPage: 1,
    likedPhotoPage: 1,
    lastToggledPersonalPhotoId: null,
    albumBuilderPhotoIds: [],
    albumPhotoPickerIds: [],
    albumPhotoPickerReturnRoute: null,
    editingAlbumId: null,
    albumDetailEditMode: false,
    albumDetailPhotos: [],
    tripReviewDateFilter: null,
    tripReviewFocusPhotoId: null,
    removedAlbumPhotoKeys: {},
    editingPhotoVisibility: 'private',
    editingPhotoLocationPrecision: 'hidden',
    selectedLocationPhotoId: null,
    pendingAuthAction: null,
    pendingAuthRoute: null,
    exploreZoom: 7,
    exploreMap: null,
    exploreMapResizeObserver: null,
    exploreMapResizeTimer: null,
    exploreMarkers: [],
    exploreClusterListener: null,
    exploreClusterListenerMap: null,
    exploreMarkerPhotos: [],
    exploreSelectedAlbumId: null,
    exploreAutocomplete: null,
    exploreMapLoadPromise: null,
    exploreLastBoundsKey: null,
    exploreMarkerRenderToken: 0,
    exploreRenderedZoom: null,
    exploreMarkerIdleListener: null,
    exploreMarkerIdleTimer: null,
    exploreZoomIdleListener: null,
    exploreMarkerRefreshTimer: null,
    isExploreMapCameraAnimating: false,
    isExploreMarkerLoading: false,
    explorePhotoScope: 'mine',
    exploreInitializedUserId: null,
    isExplorePhotoScopeMenuOpen: false,
    explorePreserveViewportOnce: false,
    isExploreDiscoveryCollapsed: false,
    isExploreMobileDiscoveryOpen: false,
    explorePreviewEditMode: false,
    isNotificationPopoverOpen: false,
    accountProfileEditMode: false,
    accountProfileAvatarPreviewUrl: null,
    profileMap: null,
    profileMarkers: [],
    profileMapRenderToken: 0,
    photoDetailMap: null,
    photoDetailMarkers: [],
    photoDetailMapRenderToken: 0,
    isMissingLocationBannerDismissed: false,
    tripReviewMap: null,
    tripReviewMarkers: [],
    tripReviewMapRenderToken: 0,
    googleMapsApiKey: null,
    googleMapsMapId: null,
    googleMapsConfigPromise: null,
    locationEditorMap: null,
    locationEditorMarker: null,
    locationEditorMapClickListener: null,
    locationEditorPickMode: false,
    isPersistingUpload: false,
    isSavingShare: false,
    landingSections: getDefaultLandingSections(),
    landingAssignments: [],
    hasLoadedLandingCuration: false,
    landingVisibleCounts: {},
    landingSearchQuery: '',
    selectedLandingSectionId: null,
    landingTagPage: 1,
    landingTagRegion: '',
    landingTagPhotos: [],
    landingTagRandomSeeds: {},
    myLibraryTab: 'photos',
    isAccountMenuOpen: false,
    photoDetailStreetView: null
};

const EXPLORE_PHOTO_SCOPE_META = {
    mine: { icon: 'person', label: '내 사진' },
    others: { icon: 'groups', label: '다른 사람 사진' }
};

const getCurrentRoute = () => parseRouteHash(window.location.hash);

const LANDING_ROUTE = 'landing';
const ROUTES = new Set([LANDING_ROUTE, 'home', 'myphoto', 'explore', 'upload', 'photos', 'liked', 'album', 'album-photos', 'trip', 'tag', 'profile', 'admin-landing']);
const ALBUM_STORY_MARKER = '[[IKKYEE_ALBUM_STORY:';
const ALBUM_STORY_MARKER_PATTERN = /\n?\n?\[\[IKKYEE_ALBUM_STORY:([^\]]*)\]\]/;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const TURNSTILE_SITE_KEY = window.TRAVELGRAM_TURNSTILE_SITE_KEY || '';
let turnstileWidgetId = null;
let turnstileToken = '';
let turnstileLoadPromise = null;
let lastModalTrigger = null;
let landingHeroTimer = null;
let landingHeroIndex = 0;
const MODAL_FOCUSABLE_SELECTOR = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function renderActionableFailure(copy, action = 'data-retry-saved-library') {
    return `
        <article class="empty-state album-empty-state actionable-failure-state" role="status">
            <div>
                <strong>${escapeHtml(copy.title)}</strong>
                <span>${escapeHtml(copy.body)}</span>
            </div>
            <button class="btn-secondary" ${action} type="button">${escapeHtml(copy.action)}</button>
        </article>
    `;
}

function renderMapUnavailable(container) {
    if (!container) return;
    const copy = getMapUnavailableState();
    container.innerHTML = `
        <div class="map-api-warning" role="status">
            <strong>${escapeHtml(copy.title)}</strong>
            <span>${escapeHtml(copy.body)}</span>
            <button class="btn-secondary" data-retry-map type="button">${escapeHtml(copy.action)}</button>
        </div>
    `;
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

function parseAlbumStoryEntries(note = '') {
    const match = String(note || '').match(ALBUM_STORY_MARKER_PATTERN);
    if (!match) return [];
    try {
        const parsed = JSON.parse(decodeURIComponent(match[1]));
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((entry) => ({
                after: String(entry?.after || '').trim(),
                text: String(entry?.text || '').trim()
            }))
            .filter((entry) => entry.after && entry.text);
    } catch {
        return [];
    }
}

function getAlbumVisibleNote(albumOrNote = '') {
    const note = typeof albumOrNote === 'string' ? albumOrNote : albumOrNote?.note;
    return String(note || '').replace(ALBUM_STORY_MARKER_PATTERN, '').trim();
}

function serializeAlbumNoteWithStory(note = '', entries = []) {
    const visibleNote = getAlbumVisibleNote(note);
    const cleanEntries = entries
        .map((entry) => ({
            after: String(entry?.after || '').trim(),
            text: String(entry?.text || '').trim()
        }))
        .filter((entry) => entry.after && entry.text);
    if (!cleanEntries.length) return visibleNote;
    const story = `${ALBUM_STORY_MARKER}${encodeURIComponent(JSON.stringify(cleanEntries))}]]`;
    return `${visibleNote}${visibleNote ? '\n\n' : ''}${story}`;
}

function getAlbumStoryMap(album = {}) {
    return new Map(parseAlbumStoryEntries(album.note).map((entry) => [entry.after, entry.text]));
}

function getPhotoFallbackLabel(photo, fallback = '사진') {
    return String(photo?.description || '').trim() || fallback;
}

function getPhotoDescriptionText(photo) {
    return String(photo?.description || '').trim();
}

function getPhotoImageSrc(photo = {}) {
    return photo?.url || photo?.albumCoverUrl || MAIN_BG_2_URL;
}

function renderPhotoImage(photo = {}, fallback = '사진', { fetchPriority = 'auto' } = {}) {
    const src = escapeHtml(getPhotoImageSrc(photo));
    const alt = escapeHtml(getPhotoFallbackLabel(photo, fallback));
    const priority = ['high', 'low'].includes(fetchPriority) ? ` fetchpriority="${fetchPriority}"` : '';
    return `<img src="${src}" alt="${alt}" loading="lazy" decoding="async"${priority}>`;
}

function revealPhotoThumbnailGridWhenReady(container) {
    if (!container) return;
    const images = [...container.querySelectorAll('img')];
    if (!images.length) {
        container.classList.remove('is-loading-thumbnails');
        return;
    }

    const loadId = String(Date.now() + Math.random());
    container.dataset.thumbnailLoadId = loadId;
    container.classList.add('is-loading-thumbnails');
    Promise.all(images.map((image) => {
        image.loading = 'eager';
        if (image.complete) return Promise.resolve();
        return new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
        });
    })).then(() => {
        if (container.dataset.thumbnailLoadId !== loadId) return;
        container.classList.remove('is-loading-thumbnails');
    });
}

function getPhotoImageFallbackSrc(photo = {}, primarySrc = '') {
    if (photo?.albumCoverUrl && photo.albumCoverUrl !== primarySrc) return photo.albumCoverUrl;
    return MAIN_BG_2_URL;
}

function setImageSourceWithFallback(image, primarySrc, fallbackSrc = MAIN_BG_2_URL) {
    if (!image) return;
    const source = primarySrc || fallbackSrc || MAIN_BG_2_URL;
    const fallback = fallbackSrc && fallbackSrc !== source ? fallbackSrc : MAIN_BG_2_URL;
    image.dataset.fallbackApplied = 'false';
    image.onerror = () => {
        if (image.dataset.fallbackApplied === 'true') return;
        image.dataset.fallbackApplied = 'true';
        image.src = fallback;
    };
    image.src = source;
}

function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

function getTurnstileToken() {
    return turnstileToken;
}

function loadTurnstileScript() {
    if (!TURNSTILE_SITE_KEY) return Promise.resolve(false);
    if (window.turnstile) return Promise.resolve(true);
    if (turnstileLoadPromise) return turnstileLoadPromise;

    turnstileLoadPromise = new Promise((resolve) => {
        const existingScript = document.querySelector('script[data-turnstile-script]');
        if (existingScript) {
            if (existingScript.dataset.turnstileLoaded === 'true') {
                resolve(Boolean(window.turnstile));
                return;
            }
            existingScript.addEventListener('load', () => resolve(Boolean(window.turnstile)), { once: true });
            existingScript.addEventListener('error', () => {
                turnstileLoadPromise = null;
                resolve(false);
            }, { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.dataset.turnstileScript = 'true';
        script.onload = () => {
            script.dataset.turnstileLoaded = 'true';
            resolve(Boolean(window.turnstile));
        };
        script.onerror = () => {
            turnstileLoadPromise = null;
            resolve(false);
        };
        document.head.appendChild(script);
    });

    return turnstileLoadPromise;
}

function resetTurnstile() {
    turnstileToken = '';
    if (window.turnstile && turnstileWidgetId !== null) {
        window.turnstile.reset(turnstileWidgetId);
    }
}

async function initTurnstile() {
    const container = $('#turnstile-container');
    if (!container || !TURNSTILE_SITE_KEY || turnstileWidgetId !== null) return;
    const isLoaded = await loadTurnstileScript();
    if (!isLoaded || !window.turnstile || turnstileWidgetId !== null) return;
    turnstileWidgetId = window.turnstile.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => {
            turnstileToken = token;
        },
        'expired-callback': () => {
            turnstileToken = '';
        },
        'error-callback': () => {
            turnstileToken = '';
        }
    });
    container.hidden = false;
}

function resetAuthModal() {
    const form = $('#auth-form');
    const message = $('#auth-message');
    setAuthMode('login');
    if (form) form.hidden = true;
    if (message) message.textContent = '';
}

function setAuthMode(mode) {
    state.authMode = mode === 'signup' ? 'signup' : 'login';
    const isSignup = state.authMode === 'signup';
    const title = $('#auth-title');
    const intro = $('.auth-intro');
    const modeCopy = $('[data-auth-mode-copy]');
    const signupButton = $('#btn-signup');
    const loginButton = $('#btn-switch-login');
    const emailButton = $('#btn-email-start');
    const emailSubmit = $('#btn-email-submit');
    const resetButton = $('#btn-reset-password');
    const form = $('#auth-form');
    const emailInput = $('#email-input');
    const passwordInput = $('#password-input');
    const message = $('#auth-message');

    if (title) title.textContent = isSignup ? '\uD68C\uC6D0\uAC00\uC785' : '\uB85C\uADF8\uC778';
    if (intro) {
        intro.textContent = isSignup
            ? 'Google, Kakao, \uC774\uBA54\uC77C \uC911 \uD3B8\uD55C \uBC29\uBC95\uC73C\uB85C \uAC00\uC785\uD558\uC138\uC694. \uC774\uBA54\uC77C \uAC00\uC785\uC740 \uC778\uC99D \uD6C4 \uC5C5\uB85C\uB4DC\uC640 \uACF5\uAC1C\uAC00 \uAC00\uB2A5\uD574\uC694.'
            : 'Google, Kakao, \uC774\uBA54\uC77C \uC911 \uD3B8\uD55C \uBC29\uBC95\uC73C\uB85C \uB85C\uADF8\uC778\uD558\uC138\uC694.';
    }
    if (modeCopy) modeCopy.textContent = isSignup ? '\uC774\uBBF8 \uACC4\uC815\uC774 \uC788\uB098\uC694?' : '\uACC4\uC815\uC774 \uC5C6\uB098\uC694?';
    if (signupButton) signupButton.hidden = isSignup;
    if (loginButton) loginButton.hidden = !isSignup;
    if (emailButton) {
        emailButton.lastChild.textContent = isSignup
            ? ' \uC774\uBA54\uC77C\uB85C \uD68C\uC6D0\uAC00\uC785'
            : ' \uC774\uBA54\uC77C\uB85C \uB85C\uADF8\uC778';
    }
    if (emailSubmit) emailSubmit.textContent = isSignup ? '\uD68C\uC6D0\uAC00\uC785' : 'Login';
    if (resetButton) resetButton.hidden = isSignup;
    if (form) form.hidden = true;
    if (emailInput) emailInput.autocomplete = isSignup ? 'email' : 'email';
    if (passwordInput) passwordInput.autocomplete = isSignup ? 'new-password' : 'current-password';
    if (message) message.textContent = '';
}

function showEmailAuthForm() {
    const form = $('#auth-form');
    if (form) form.hidden = false;
    $('#email-input')?.focus();
    void initTurnstile();
}

function parseRouteHash(hash) {
    if (!hash) return LANDING_ROUTE;
    if (!hash.startsWith('#/')) return APP_SECTIONS.HOME;
    const path = hash.slice(2).split('?')[0].replace(/^\/+|\/+$/g, '');
    if (!path) return APP_SECTIONS.HOME;
    if (path === APP_SECTIONS.MYPHOTO) return APP_SECTIONS.HOME;
    if (ROUTES.has(path)) return path;
    return parseSectionHash(hash) || APP_SECTIONS.HOME;
}

function getRenderedRoute(route) {
    if (route === 'tag') return 'trip';
    return route === APP_SECTIONS.MYPHOTO ? APP_SECTIONS.HOME : route;
}

function routeTo(section, { replace = false } = {}) {
    const normalized = ROUTES.has(section) ? section : normalizeAppSection(section);
    const renderedRoute = getRenderedRoute(normalized);
    if (normalized === 'admin-landing' && !isLandingAdmin(state.currentUser)) {
        showToast('관리자 계정에서만 메인 구성을 편집할 수 있습니다.');
        return;
    }
    const authRequiredRoute = getAuthRequiredRoute(normalized, state.currentUser);
    if (authRequiredRoute) {
        state.pendingAuthRoute = authRequiredRoute;
        openModal('#auth-modal');
        showToast('사진을 업로드하려면 먼저 로그인해주세요.');
        return;
    }
    const hash = normalized === LANDING_ROUTE ? '#/landing' : normalized === APP_SECTIONS.HOME ? '#/' : `#/${renderedRoute}`;
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
    state.tripReviewDateFilter = null;
    state.tripReviewFocusPhotoId = null;
    routeToPublic('trip', albumId, options);
}

function routeToLandingTag(sectionId, { replace = false } = {}) {
    const section = state.landingSections.find((candidate) => String(candidate.id) === String(sectionId));
    if (!canOpenLandingTagPage(section)) return;
    state.selectedLandingSectionId = String(section.id);
    state.landingTagPage = 1;
    state.landingTagRegion = '';
    state.tripReviewDateFilter = null;
    state.tripReviewFocusPhotoId = null;
    const hash = buildLandingTagHash(section.id);
    if (replace) window.history.replaceState(null, '', hash);
    else if (window.location.hash !== hash) window.location.hash = hash;
    renderRoute('tag');
}

function clearUploadQueue() {
    state.stagedPhotos.forEach((photo) => URL.revokeObjectURL(photo.url));
    state.stagedPhotos = [];
    renderStagedPhotos();
}

function renderRoute(section) {
    const routeRenderStartedAt = window.performance.now();
    const normalized = ROUTES.has(section) ? section : normalizeAppSection(section);
    const renderedRoute = getRenderedRoute(normalized);
    const previousRoute = document.body.dataset.page || null;
    const routeSharedState = getSharedRouteState(window.location.hash);
    if (shouldClearUploadQueue(previousRoute, normalized) && state.stagedPhotos.length) {
        clearUploadQueue();
    }
    if (normalized === APP_SECTIONS.EXPLORE && previousRoute !== APP_SECTIONS.EXPLORE && !routeSharedState.albumId) {
        resetExploreSelectionState();
        if (state.currentUser?.id && state.exploreInitializedUserId !== state.currentUser.id) {
            state.explorePhotoScope = 'mine';
            state.exploreInitializedUserId = state.currentUser.id;
        }
        state.exploreLastBoundsKey = null;
        state.explorePreserveViewportOnce = false;
        if (isExploreMobileViewport()) setExploreMobileDiscoveryOpen(true);
    }
    if (normalized !== APP_SECTIONS.EXPLORE && state.isExploreMobileDiscoveryOpen) {
        setExploreMobileDiscoveryOpen(false);
    }
    if (normalized !== 'trip') state.albumDetailEditMode = false;
    const navSection = [APP_SECTIONS.MYPHOTO, 'upload', 'photos', 'liked', 'album', 'album-photos', 'trip', 'tag', 'admin-landing'].includes(normalized)
        ? APP_SECTIONS.HOME
        : ['profile'].includes(normalized)
            ? APP_SECTIONS.EXPLORE
            : renderedRoute;

    document.body.dataset.page = normalized === LANDING_ROUTE ? LANDING_ROUTE : normalized === 'tag' ? 'tag' : renderedRoute;
    $$('.page').forEach((page) => page.classList.remove('active'));
    $(`#page-${renderedRoute}`)?.classList.add('active');
    setLandingHeroSlideshowActive(normalized === LANDING_ROUTE);
    $$('[data-route]').forEach((link) => link.classList.toggle('active', link.dataset.route === navSection));
    if (normalized === 'album') renderAlbumComposePage();
    if (normalized === 'album-photos') renderAlbumPhotoPickerPage();
    if (normalized === 'liked') renderLikedPhotoSurfaces();
    if (renderedRoute === APP_SECTIONS.HOME) {
        renderSavedPhotoSurfaces();
        renderLandingSections();
    }
    if (normalized === 'photos') setMyLibraryTab(state.myLibraryTab);
    if (normalized === 'admin-landing') renderLandingAdminForm();
    if (normalized === 'tag') renderLandingTagPage();
    if (normalized === APP_SECTIONS.EXPLORE || normalized === 'trip' || normalized === 'profile') renderPublicSurfaces();
    if (normalized === APP_SECTIONS.EXPLORE) {
        requestAnimationFrame(() => refreshExploreMapAfterRouteEntry());
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.body.dataset.routeRenderMs = (window.performance.now() - routeRenderStartedAt).toFixed(2);
}

async function refreshExploreMapAfterRouteEntry() {
    if (document.body.dataset.page !== APP_SECTIONS.EXPLORE) return;
    const map = await ensureExploreMap();
    const maps = window.google?.maps;
    if (!map || !maps || document.body.dataset.page !== APP_SECTIONS.EXPLORE) return;
    maps.event.trigger(map, 'resize');
    state.exploreLastBoundsKey = null;
    state.explorePreserveViewportOnce = false;
    const photos = getExplorePhotoMapItems();
    if (photos.length) renderExploreMapMarkers(photos, state.exploreSelectedAlbumId);
}

function applyRouteHash(hash, options = {}) {
    const sharedRoute = getSharedRouteState(hash);
    if (sharedRoute.albumId) state.selectedPublicAlbumId = sharedRoute.albumId;
    if (sharedRoute.ownerId) {
        state.selectedPublicOwnerId = sharedRoute.ownerId;
        state.selectedPublicAlbumId = null;
    }
    if (sharedRoute.route === 'tag') {
        const nextSectionId = parseLandingTagId(hash);
        if (String(state.selectedLandingSectionId || '') !== String(nextSectionId || '')) {
            state.landingTagPage = 1;
            state.landingTagRegion = '';
        }
        state.selectedLandingSectionId = nextSectionId;
    }
    const route = sharedRoute.route || parseRouteHash(hash);
    const normalized = ROUTES.has(route) ? route : normalizeAppSection(route);
    if (options.replace) {
        const renderedRoute = getRenderedRoute(normalized);
        const nextHash = hash && hash.startsWith('#/')
            ? hash
            : renderedRoute === 'home'
                ? '#/'
                : `#/${renderedRoute}`;
        window.history.replaceState(null, '', nextHash);
    }
    renderRoute(normalized);
    if (sharedRoute.albumId || sharedRoute.ownerId) renderPublicSurfaces();
}

function getModalFocusableElements(modal) {
    if (!modal) return [];
    return Array.from(modal.querySelectorAll(MODAL_FOCUSABLE_SELECTOR))
        .filter((element) => !element.closest('[hidden]') && element.getAttribute('aria-hidden') !== 'true');
}

function openModal(id) {
    const modal = $(id);
    if (!modal) return;
    if (id === '#auth-modal') resetAuthModal();
    if (document.activeElement instanceof HTMLElement && !document.activeElement.closest('.modal')) {
        lastModalTrigger = document.activeElement;
    }
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    syncModalScrollLock();
    window.requestAnimationFrame(() => getModalFocusableElements(modal)[0]?.focus());
}

function syncModalScrollLock() {
    document.body.classList.toggle('modal-open', Boolean($('.modal.is-open')));
}

function closeModals() {
    $$('.modal').forEach((modal) => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
    });
    document.body.classList.remove('photo-fullscreen-open');
    syncModalScrollLock();
    if (lastModalTrigger?.isConnected) lastModalTrigger.focus();
    lastModalTrigger = null;
}

function closePhotoFullscreenModal() {
    const modal = $('#photo-fullscreen-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('photo-fullscreen-open');
    syncModalScrollLock();
}

function returnToPhotoDetailFromFullscreen() {
    closePhotoFullscreenModal();
    const detailModal = $('#photo-detail-modal');
    if (!detailModal) return;
    detailModal.classList.add('is-open');
    detailModal.setAttribute('aria-hidden', 'false');
}

function getAllDisplayPhotos() {
    return [
        ...state.savedPhotos,
        ...state.stagedPhotos.map((photo, index) => ({
            id: `staged-${index}`,
            description: '',
            url: photo.url,
            date: new Date().toISOString(),
            album: '업로드 초안',
            visibility: 'private',
            shared: false
        }))
    ];
}

function getLandingPublicPhotos() {
    const demoPhotos = [
        { id: 'landing-nice', url: MAIN_BG_1_URL, description: '니스의 거리와 카페', placeName: '프랑스 니스', album: '도시 골목', lat: 43.7102, lng: 7.2620 },
        { id: 'landing-kyoto', url: MAIN_BG_2_URL, description: '교토의 자전거와 조용한 골목', placeName: '일본 교토', album: '도시 골목', lat: 35.0116, lng: 135.7681 },
        { id: 'landing-interlaken', url: MAIN_BG_3_URL, description: '숲과 산이 이어지는 길', placeName: '스위스 인터라켄', album: '자연 여행', lat: 46.6863, lng: 7.8632 },
        { id: 'landing-bangkok', url: MAIN_BG_4_URL, description: '바다와 하늘이 만나는 하루', placeName: '태국 방콕', album: '바다 여행', lat: 13.7563, lng: 100.5018 },
        { id: 'landing-merzouga', url: MAIN_BG_5_URL, description: '사막에 남은 여행의 빛', placeName: '모로코 메르주가', album: '자연 여행', lat: 31.0993, lng: -4.0111 }
    ].map((photo) => ({
        ...photo,
        owner_id: 'demo',
        visibility: 'public',
        shared: true,
        location_precision: 'exact'
    }));
    const albumPhotos = getPublicAlbums().flatMap((album) => album.photos || []);
    const candidates = [...state.savedPhotos, ...albumPhotos, ...demoPhotos]
        .filter((photo) => photo?.shared || photo?.visibility === 'public');
    const seen = new Set();
    return candidates.filter((photo) => {
        const id = String(photo.id || photo.localId || photo.url || '');
        if (!id || seen.has(id) || !getPhotoImageSrc(photo)) return false;
        seen.add(id);
        return true;
    });
}

function getLandingPhotoLabel(photo) {
    return String(photo.placeName || photo.description || photo.title || photo.album || '여행 사진').trim();
}

function renderLandingPhotoCard(photo) {
    const photoId = String(photo.id || photo.localId || '');
    const label = getLandingPhotoLabel(photo);
    return `
        <button class="landing-photo-card" data-landing-photo-id="${escapeHtml(photoId)}" type="button" aria-label="${escapeHtml(label)} 상세 보기">
            <img src="${escapeHtml(getPhotoImageSrc(photo))}" alt="${escapeHtml(label)}" loading="lazy" decoding="async">
        </button>
    `;
}

function renderLandingSections() {
    const container = $('#landing-sections');
    if (!container) return;
    const allPhotos = getLandingPublicPhotos();
    const query = state.landingSearchQuery.trim();
    const searchResults = getLandingSearchResults(allPhotos, query);
    const sections = query
        ? [{ id: 'search-results', title: `“${query}” 검색 결과`, description: `${searchResults.length}장의 공개 사진을 찾았습니다.`, photo_ids: searchResults.map((photo) => photo.id) }]
        : state.landingSections;
    const resultCopy = $('#landing-search-result-copy');
    if (resultCopy) resultCopy.textContent = query
        ? `${query} 검색 결과 ${searchResults.length}장`
        : '공개 사진을 주제별로 둘러보세요.';

    container.innerHTML = sections.map((section, sectionIndex) => {
        const sectionPhotos = query
            ? searchResults
            : getLandingSectionPhotos(section, allPhotos, sectionIndex);
        const visibleCount = state.landingVisibleCounts[section.id] || LANDING_SECTION_BATCH_SIZE;
        const visiblePhotos = getLandingVisiblePhotos(sectionPhotos, visibleCount);
        const cards = visiblePhotos.length
            ? visiblePhotos.map(renderLandingPhotoCard).join('')
            : '<div class="landing-empty-state"><strong>이 주제에 표시할 공개 사진이 아직 없습니다.</strong><p>다른 주제를 둘러보거나 검색어를 바꿔보세요.</p></div>';
        return `
            <section class="landing-photo-section" data-landing-section="${escapeHtml(section.id)}" aria-labelledby="landing-section-${escapeHtml(section.id)}">
                <div class="landing-section-heading">
                    <h2 id="landing-section-${escapeHtml(section.id)}">${escapeHtml(section.title)}</h2>
                    ${canOpenLandingTagPage(section) ? `
                        <button class="landing-section-view-all" data-landing-view-all="${escapeHtml(section.id)}" type="button">
                            전체보기
                        </button>
                    ` : ''}
                    <div class="landing-scroll-actions" aria-label="${escapeHtml(section.title)} 사진 이동">
                        <button data-landing-scroll-direction="previous" type="button" aria-label="이전 사진" disabled><span class="material-symbols-outlined">chevron_left</span></button>
                        <button data-landing-scroll-direction="next" type="button" aria-label="다음 사진" ${visiblePhotos.length > 1 ? '' : 'disabled'}><span class="material-symbols-outlined">chevron_right</span></button>
                    </div>
                </div>
                <div class="landing-photo-row" data-landing-scroll tabindex="0" aria-label="${escapeHtml(section.title)} 사진 목록" data-total-count="${sectionPhotos.length}">${cards}</div>
            </section>
        `;
    }).join('');
    centerLandingRowsOnMobile();
}

function centerLandingRowsOnMobile() {
    if (!window.matchMedia('(max-width: 760px)').matches) return;
    requestAnimationFrame(() => {
        $$('[data-landing-scroll]').forEach((row) => {
            const cards = row.querySelectorAll('.landing-photo-card');
            if (cards.length < 3) return;
            const target = cards[1];
            row.scrollLeft = target.offsetLeft - (row.clientWidth - target.clientWidth) / 2;
            updateLandingScrollButtons(row);
        });
    });
}

async function loadLandingCuration() {
    const { sections, assignments, error } = await fetchLandingCuration();
    if (!error && sections.length) {
        state.landingAssignments = assignments;
        state.landingSections = normalizeLandingSections(sections, assignments, { includeHidden: isLandingAdmin(state.currentUser) });
    }
    state.hasLoadedLandingCuration = true;
    renderLandingSections();
    if (getCurrentRoute() === 'tag') renderLandingTagPage();
}

function setAccountMenuOpen(isOpen) {
    state.isAccountMenuOpen = Boolean(isOpen && state.currentUser);
    const trigger = $('#btn-open-profile');
    const popover = $('#account-menu-popover');
    if (trigger) trigger.setAttribute('aria-expanded', state.isAccountMenuOpen ? 'true' : 'false');
    if (popover) popover.hidden = !state.isAccountMenuOpen;
}

function setMyLibraryTab(tab = 'photos') {
    state.myLibraryTab = tab === 'albums' ? 'albums' : 'photos';
    $$('[data-my-library-tab]').forEach((button) => {
        const active = button.dataset.myLibraryTab === state.myLibraryTab;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    $$('[data-my-library-panel]').forEach((panel) => {
        panel.hidden = panel.dataset.myLibraryPanel !== state.myLibraryTab;
    });
}

function syncPhotosAlbumList() {
    const source = $('#album-list');
    const target = $('#photos-album-list');
    if (!source || !target) return;
    target.innerHTML = source.innerHTML.replace('id="btn-open-album-inline"', 'data-start-album');
}

function renderLandingAdminForm() {
    const container = $('#landing-admin-sections');
    if (!container) return;
    if (!isLandingAdmin(state.currentUser)) {
        routeTo(LANDING_ROUTE, { replace: true });
        return;
    }
    const publicPhotos = getLandingPublicPhotos().filter((photo) => !String(photo.id).startsWith('landing-'));
    container.innerHTML = state.landingSections.map((section, index) => {
        const selectedIds = (section.photo_ids || []).slice(0, LANDING_TAG_PIN_LIMIT);
        const photoById = new Map(publicPhotos.map((photo) => [String(photo.id), photo]));
        const selectedMarkup = selectedIds.map((photoId, photoIndex) => {
            const photo = photoById.get(String(photoId));
            if (!photo) return '';
            return `
                <div class="admin-selected-photo" data-admin-selected-photo="${escapeHtml(photoId)}">
                    <img src="${escapeHtml(getPhotoImageSrc(photo))}" alt="">
                    <span>${escapeHtml(getLandingPhotoLabel(photo))}</span>
                    <button data-admin-photo-move="previous" type="button" aria-label="사진을 앞으로 이동" ${photoIndex === 0 ? 'disabled' : ''}>↑</button>
                    <button data-admin-photo-move="next" type="button" aria-label="사진을 뒤로 이동" ${photoIndex === selectedIds.length - 1 ? 'disabled' : ''}>↓</button>
                </div>`;
        }).join('');
        const pickerMarkup = publicPhotos.map((photo) => {
            const selected = selectedIds.includes(String(photo.id));
            return `
                <button class="admin-photo-option ${selected ? 'is-selected' : ''}" data-admin-photo-toggle="${escapeHtml(photo.id)}" type="button" aria-pressed="${selected}">
                    <img src="${escapeHtml(getPhotoImageSrc(photo))}" alt="">
                    <span>${escapeHtml(getLandingPhotoLabel(photo))}</span>
                </button>`;
        }).join('');
        return `
        <fieldset class="admin-landing-section" data-admin-landing-section="${escapeHtml(section.id)}">
            <div class="admin-landing-section__topline">
                <strong>섹션 ${index + 1}</strong>
                <div>
                    <button data-admin-section-move="previous" type="button" ${index === 0 ? 'disabled' : ''}>위로</button>
                    <button data-admin-section-move="next" type="button" ${index === state.landingSections.length - 1 ? 'disabled' : ''}>아래로</button>
                    <button data-admin-section-remove type="button">삭제</button>
                </div>
            </div>
            <label>소제목<input name="title" maxlength="80" value="${escapeHtml(section.title)}" required></label>
            <label>설명<textarea name="description" maxlength="180" rows="2">${escapeHtml(section.description || '')}</textarea></label>
            <label>공개 상태<select name="is_visible"><option value="true" ${section.is_visible !== false ? 'selected' : ''}>공개</option><option value="false" ${section.is_visible === false ? 'selected' : ''}>숨김</option></select></label>
            <div class="admin-selected-photos"><strong>상단 고정 사진 (최대 20장)</strong>${selectedMarkup || '<p>고정하지 않으면 태그 사진이 무작위 순서로 표시됩니다.</p>'}</div>
            <div class="admin-photo-picker" aria-label="공개 사진 선택">${pickerMarkup || '<p>선택할 수 있는 실제 공개 사진이 없습니다.</p>'}</div>
            <input name="photo_ids" type="hidden" value="${escapeHtml(selectedIds.join(','))}">
            <input name="sort_order" type="hidden" value="${index}">
        </fieldset>
    `;
    }).join('');
}

function syncLandingAdminDrafts() {
    $$('[data-admin-landing-section]').forEach((fieldset) => {
        const section = state.landingSections.find((candidate) => String(candidate.id) === fieldset.dataset.adminLandingSection);
        if (!section) return;
        section.title = fieldset.querySelector('[name="title"]')?.value || section.title;
        section.description = fieldset.querySelector('[name="description"]')?.value || '';
        section.is_visible = fieldset.querySelector('[name="is_visible"]')?.value !== 'false';
    });
}

function updateLandingScrollButtons(row) {
    const section = row?.closest('[data-landing-section]');
    if (!section) return;
    const previous = section.querySelector('[data-landing-scroll-direction="previous"]');
    const next = section.querySelector('[data-landing-scroll-direction="next"]');
    const maxScroll = Math.max(0, row.scrollWidth - row.clientWidth);
    if (previous) previous.disabled = row.scrollLeft <= 4;
    if (next) next.disabled = row.scrollLeft >= maxScroll - 4 && row.children.length >= Number(row.dataset.totalCount || 0);
}

function loadMoreLandingSectionPhotos(row) {
    const section = row?.closest('[data-landing-section]');
    const sectionId = section?.dataset.landingSection;
    if (!sectionId) return;
    const totalCount = Number(row.dataset.totalCount || 0);
    const currentCount = row.querySelectorAll('.landing-photo-card').length;
    if (currentCount >= totalCount || row.scrollLeft + row.clientWidth < row.scrollWidth - 160) return;
    const scrollLeft = row.scrollLeft;
    state.landingVisibleCounts[sectionId] = currentCount + LANDING_SECTION_BATCH_SIZE;
    renderLandingSections();
    requestAnimationFrame(() => {
        const nextRow = $(`[data-landing-section="${CSS.escape(sectionId)}"] [data-landing-scroll]`);
        if (nextRow) {
            nextRow.scrollLeft = scrollLeft;
            updateLandingScrollButtons(nextRow);
        }
    });
}

function submitLandingSearch(event) {
    event.preventDefault();
    syncLandingSearchQuery();
}

function syncLandingSearchQuery() {
    state.landingSearchQuery = $('#landing-search-input')?.value || '';
    state.landingVisibleCounts = {};
    renderLandingSections();
}

async function saveLandingAdminForm(event) {
    event.preventDefault();
    const message = $('#landing-admin-message');
    if (!isLandingAdmin(state.currentUser)) return;
    const fieldsets = $$('[data-admin-landing-section]');
    if (message) message.textContent = '메인 구성을 저장하는 중입니다…';
    for (const [index, fieldset] of fieldsets.entries()) {
        const formData = new FormData();
        fieldset.querySelectorAll('input, textarea, select').forEach((input) => formData.set(input.name, input.value));
        const currentId = fieldset.dataset.adminLandingSection;
        const id = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(currentId) ? currentId : crypto.randomUUID();
        const photoIds = String(formData.get('photo_ids') || '').split(',').map((value) => value.trim()).filter(Boolean).slice(0, LANDING_TAG_PIN_LIMIT);
        const { error } = await saveLandingSection({
            id,
            title: formData.get('title'),
            description: formData.get('description'),
            sort_order: index,
            is_visible: formData.get('is_visible') === 'true'
        }, photoIds);
        if (error) {
            if (message) message.textContent = error.message || '메인 구성을 저장하지 못했습니다.';
            return;
        }
    }
    await loadLandingCuration();
    renderLandingAdminForm();
    if (message) message.textContent = '메인 구성을 저장했습니다.';
}

function getDefaultDetailPhoto() {
    const selectedAlbum = getSelectedPublicAlbum();
    return selectedAlbum?.photos?.[0]
        || getAllDisplayPhotos()[0]
        || { id: 'empty-detail', name: '여행 사진', url: MAIN_BG_2_URL, date: new Date().toISOString(), album: selectedAlbum?.title || '여행 앨범', visibility: selectedAlbum?.visibility || 'private' };
}

function getHomeReferencePhotoDetail(trigger) {
    const image = trigger?.querySelector?.('img');
    const lat = Number(trigger?.dataset?.homePhotoLat);
    const lng = Number(trigger?.dataset?.homePhotoLng);
    return {
        id: trigger?.dataset?.homePhotoId || 'home-reference-photo',
        url: image?.currentSrc || image?.src || trigger?.dataset?.homePhotoSrc || MAIN_BG_2_URL,
        description: trigger?.dataset?.homePhotoCopy || trigger?.dataset?.homePhotoTitle || image?.getAttribute('alt') || '여행 사진',
        date: trigger?.dataset?.homePhotoDate || new Date().toISOString(),
        album: 'Ikkyee 소개 사진',
        visibility: 'public',
        location_precision: 'exact',
        shared: true,
        owner_id: 'demo',
        placeName: trigger?.dataset?.homePhotoLocation || '',
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        liked: 0
    };
}

function openHomeReferencePhotoDetail(trigger) {
    const photo = getHomeReferencePhotoDetail(trigger);
    updatePhotoDetailModal(photo, { context: 'photo' });
    openModal('#photo-detail-modal');
}

function hasPhotoLocation(photo) {
    return hasUsablePhotoLocation(photo);
}

function formatPhotoDateInput(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '';
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 16);
}

function normalizePhotoMapItem(photo) {
    const album = photo.album_id
        ? state.savedAlbums.find((candidate) => candidate.id === photo.album_id)
        : null;
    return {
        ...photo,
        album_id: photo.album_id || null,
        album: photo.album || album?.title || '개별 사진',
        albumTitle: album?.title || '개별 사진',
        albumNote: album?.note || photo.description || '',
        albumVisibility: photo.visibility,
        albumCoverUrl: album?.cover_url || photo.url,
        albumOwnerId: photo.owner_id
    };
}

function getPublicPhotoMapItems() {
    return state.savedPhotos
        .filter((photo) => canShowPhotoOnPublicMap(photo) && (photo.shared || ['public', 'link'].includes(photo.visibility)))
        .map(normalizePhotoMapItem);
}

function getExplorePhotoMapItems() {
    return state.savedPhotos
        .filter((photo) => canShowPhotoInExploreScope(photo, {
            scope: state.explorePhotoScope,
            currentUserId: state.currentUser?.id || ''
        }))
        .map(normalizePhotoMapItem);
}

function getPublicProfilePhotoItems() {
    return getLandingPublicPhotos().map(normalizePhotoMapItem);
}

function renderExplorePhotoScopeControls() {
    if (!state.currentUser && state.explorePhotoScope === 'mine') {
        state.explorePhotoScope = 'others';
    }
    const scopeMeta = EXPLORE_PHOTO_SCOPE_META[state.explorePhotoScope] || EXPLORE_PHOTO_SCOPE_META.mine;
    const scope = $('.explore-photo-scope');
    const trigger = $('[data-explore-scope-trigger]');
    const triggerIcon = $('[data-explore-scope-trigger-icon]');
    const triggerLabel = $('[data-explore-scope-trigger-label]');
    const menu = $('#explore-photo-scope-menu');
    scope?.classList.toggle('is-open', state.isExplorePhotoScopeMenuOpen);
    if (trigger) trigger.setAttribute('aria-expanded', state.isExplorePhotoScopeMenuOpen ? 'true' : 'false');
    if (triggerIcon) triggerIcon.textContent = scopeMeta.icon;
    if (triggerLabel) triggerLabel.textContent = scopeMeta.label;
    if (menu) menu.hidden = !state.isExplorePhotoScopeMenuOpen;
    $$('[data-explore-scope]').forEach((button) => {
        const isActive = button.dataset.exploreScope === state.explorePhotoScope;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-checked', isActive ? 'true' : 'false');
        if (button.dataset.exploreScope === 'mine') button.disabled = !state.currentUser;
    });
}

function setExplorePhotoScopeMenuOpen(isOpen) {
    state.isExplorePhotoScopeMenuOpen = Boolean(isOpen);
    renderExplorePhotoScopeControls();
}

function setExplorePhotoScope(scope) {
    if (!['mine', 'others'].includes(scope)) return;
    const keepMobileDiscoveryOpen = isExploreMobileViewport() && state.isExploreMobileDiscoveryOpen;
    state.explorePhotoScope = scope;
    state.isExplorePhotoScopeMenuOpen = false;
    state.explorePreserveViewportOnce = shouldPreserveExploreViewport(
        getExplorePhotoMapItems(),
        getExploreCurrentBounds()
    );
    resetExploreSelectionState();
    if (keepMobileDiscoveryOpen) setExploreMobileDiscoveryOpen(true);
    renderExplorePhotoScopeControls();
    renderPublicSurfaces();
}

function resetExploreSelectionState() {
    setExploreMobileDiscoveryOpen(false);
    state.selectedPhotoId = null;
    state.selectedPublicAlbumId = null;
    setExploreDiscoverySelection(null);
    document.body.classList.remove('explore-pin-selected');
    setExplorePreviewExpanded(false);
    $('#explore-pin-preview')?.setAttribute('hidden', '');
}

function clearExplorePinSelection({ restoreMapCenter = false } = {}) {
    const hadSelection = Boolean(state.selectedPhotoId);
    const selectedPhoto = state.exploreMarkerPhotos.find((photo) => photo.id === state.selectedPhotoId);
    resetExploreSelectionState();
    if (restoreMapCenter && isExploreMobileViewport() && state.exploreMap && hasPhotoLocation(selectedPhoto)) {
        state.exploreMap.panTo({ lat: Number(selectedPhoto.lat), lng: Number(selectedPhoto.lng) });
    }
    if (hadSelection && state.exploreMap && state.exploreMarkerPhotos.length) {
        renderExploreMapMarkers(state.exploreMarkerPhotos, state.exploreSelectedAlbumId);
    }
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
    const photoButton = preview.querySelector('[data-pin-preview-photo]');
    const image = photoButton?.querySelector('img');
    const storyWrap = preview.querySelector('.pin-preview-story');
    const story = preview.querySelector('.pin-preview-story p');
    const meta = preview.querySelector('.pin-preview-meta');
    const likeButton = preview.querySelector('#pin-preview-like');
    const likeCount = preview.querySelector('#pin-preview-like-count');
    const profileButton = preview.querySelector('[data-go-profile]');
    const authorAvatar = preview.querySelector('.pin-author .avatar');
    const authorNameNode = preview.querySelector('.pin-author strong');
    const authorTimeNode = preview.querySelector('.pin-author-time');
    const ownerActions = preview.querySelector('.pin-preview-owner-actions');
    const descriptionInput = $('#pin-preview-description-input');
    const description = String(photo.description || '').trim();
    const ownerId = photo.owner_id || photo.albumOwnerId || '';
    const isOwnPhoto = Boolean(state.currentUser?.id && ownerId === state.currentUser.id);
    const visibilityValue = photo.visibility === 'public' || photo.shared || photo.albumVisibility === 'public'
        ? 'public'
        : 'private';
    const isLiked = Boolean(photo.id && state.likedPhotoIds.includes(String(photo.id)));
    const likeTotal = Number(photo.liked || 0);
    state.selectedPhotoId = photo.id || null;
    state.selectedPublicOwnerId = ownerId || state.selectedPublicOwnerId;
    const authorName = getPublicAuthorName({ owner_id: ownerId }, {
        currentUser: state.currentUser,
        profileNames: state.profileNames
    });
    const date = photo.date ? new Date(photo.date) : null;
    const dateLabel = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '-- --';
    const uploadTimeLabel = formatRelativeTime(photo.created_at || photo.uploaded_at || photo.createdAt || photo.date);
    const visibilityLabel = photo.albumVisibility === 'link'
        ? '링크'
        : (photo.shared || photo.visibility === 'public' || photo.albumVisibility === 'public') ? '공개' : '비공개';
    const visibilityIcon = visibilityLabel === '비공개' ? 'lock' : 'public';
    const visibilityMeta = isOwnPhoto
        ? `<span data-pin-meta="visibility"><span class="material-symbols-outlined">${visibilityIcon}</span> ${visibilityLabel}</span>`
        : '';
    if (photoButton) photoButton.dataset.photoId = photo.id || '';
    if (image) {
        const photoImageSrc = getPhotoImageSrc(photo);
        setImageSourceWithFallback(image, photoImageSrc, getPhotoImageFallbackSrc(photo, photoImageSrc));
        image.alt = description || '공개 사진';
    }
    if (story) {
        story.textContent = description;
        if (storyWrap) storyWrap.hidden = !description;
    }
    if (meta) {
        meta.innerHTML = `
            <span data-pin-meta="date"><span class="material-symbols-outlined">calendar_today</span> ${dateLabel}</span>
            <span data-pin-meta="place"><span class="material-symbols-outlined">place</span> ${Number(photo.lat).toFixed(4)}, ${Number(photo.lng).toFixed(4)}</span>
            ${visibilityMeta}
        `;
    }
    if (likeButton) {
        likeButton.disabled = !photo.id || !state.currentUser;
        likeButton.classList.toggle('is-liked', isLiked);
        likeButton.setAttribute('aria-pressed', isLiked ? 'true' : 'false');
        likeButton.dataset.photoId = photo.id || '';
        likeButton.setAttribute('aria-label', isLiked ? '좋아요 취소' : '좋아요');
    }
    if (likeCount) likeCount.textContent = String(likeTotal);
    if (ownerActions) ownerActions.hidden = !isOwnPhoto;
    if (descriptionInput) descriptionInput.value = description;
    setExplorePreviewVisibility(visibilityValue);
    setExplorePreviewEditMode(false);
    if (profileButton) {
        profileButton.dataset.publicAlbumId = photo.album_id || '';
        profileButton.dataset.publicOwnerId = ownerId;
    }
    if (authorAvatar) authorAvatar.textContent = getAuthorInitials(authorName);
    if (authorNameNode) authorNameNode.textContent = authorName;
    if (authorTimeNode) authorTimeNode.textContent = uploadTimeLabel;
    updatePhotoDetailModal(photo, { context: 'explore' });
}

function setExploreDiscoverySelection(photoId) {
    $$('[data-explore-discovery-photo]').forEach((button) => {
        button.classList.toggle('is-selected', Boolean(photoId && button.dataset.exploreDiscoveryPhoto === String(photoId)));
    });
}

function openExplorePhotoPreview(photo, options = {}) {
    if (!photo) return;
    setExploreMobileDiscoveryOpen(false);
    if (photo.album_id) state.selectedPublicAlbumId = photo.album_id;
    updateExplorePhotoPreview(photo);
    setExplorePreviewExpanded(false);
    document.body.classList.add('explore-pin-selected');
    $('#explore-pin-preview')?.removeAttribute('hidden');
    setExploreDiscoverySelection(photo.id);
    if (state.exploreMap && state.exploreMarkerPhotos.length) {
        renderExploreMapMarkers(state.exploreMarkerPhotos, state.exploreSelectedAlbumId);
    }

    const shouldFocusMap = Boolean(options.focusMap || isExploreMobileViewport());
    if (!shouldFocusMap) return;
    const map = state.exploreMap;
    const maps = window.google?.maps;
    if (!map || !maps || !hasPhotoLocation(photo)) return;
    const position = { lat: Number(photo.lat), lng: Number(photo.lng) };
    map.panTo(position);
    if ((map.getZoom?.() || state.exploreZoom) < 13) map.setZoom(13);
    const focusPanY = getExploreMapPreviewFocusPanY({
        isMobile: isExploreMobileViewport(),
        viewportHeight: $('.explore-map-canvas')?.clientHeight || window.innerHeight,
        previewHeight: $('#explore-pin-preview')?.getBoundingClientRect?.().height
    });
    if (focusPanY) window.requestAnimationFrame(() => map.panBy(0, focusPanY));
}

async function openPhotoOnExploreMap(photo) {
    if (!photo || !hasPhotoLocation(photo)) return;
    closeModals();
    state.explorePhotoScope = photo.owner_id === state.currentUser?.id ? 'mine' : 'others';
    state.exploreInitializedUserId = state.currentUser?.id || state.exploreInitializedUserId;
    state.exploreLastBoundsKey = null;
    state.explorePreserveViewportOnce = false;
    routeTo(APP_SECTIONS.EXPLORE);
    await new Promise((resolve) => window.setTimeout(resolve, 32));
    await ensureExploreMap();
    if (document.body.dataset.page !== APP_SECTIONS.EXPLORE) return;
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    openExplorePhotoPreview(photo, { focusMap: true });
}

function setExplorePreviewExpanded(isExpanded) {
    const preview = $('#explore-pin-preview');
    if (!preview) return;
    preview.classList.toggle('is-expanded', Boolean(isExpanded));
    if (!isExpanded) setExplorePreviewEditMode(false);
}

function setExplorePreviewEditMode(isEditing) {
    state.explorePreviewEditMode = Boolean(isEditing);
    const preview = $('#explore-pin-preview');
    const form = $('#pin-preview-edit-form');
    const editButton = $('#btn-edit-pin-preview');
    const message = $('#pin-preview-edit-message');
    if (preview) preview.classList.toggle('is-editing', state.explorePreviewEditMode);
    if (form) form.hidden = !state.explorePreviewEditMode;
    if (editButton) editButton.hidden = state.explorePreviewEditMode;
    if (message) message.textContent = '';
}

function setExplorePreviewVisibility(visibility) {
    const nextVisibility = visibility === 'public' ? 'public' : 'private';
    state.editingPhotoVisibility = nextVisibility;
    $$('[data-preview-visibility]').forEach((button) => {
        button.classList.toggle('active', button.dataset.previewVisibility === nextVisibility);
    });
}

async function saveExplorePreviewEdits(event) {
    event.preventDefault();
    const photo = getMySavedPhotos().find((candidate) => candidate.id === state.selectedPhotoId);
    const message = $('#pin-preview-edit-message');
    if (!state.currentUser || !photo || photo.owner_id !== state.currentUser.id) {
        if (message) message.textContent = '본인 사진만 수정할 수 있습니다.';
        return;
    }

    const description = $('#pin-preview-description-input')?.value.trim() || '';
    const visibility = state.editingPhotoVisibility === 'public' ? 'public' : 'private';
    if (!enforceVerifiedAccount('publish')) return;
    if (!enforceNewAccountLimit('publish', {
        requestedVisibility: state.editingPhotoVisibility,
        incomingPublicCount: getPhotosBecomingPublic([photo.id])
    })) return;

    if (message) message.textContent = '저장 중입니다...';
    const { data, error } = await updatePhotoInfo(photo.id, {
        description,
        visibility,
        location_precision: visibility === 'public' ? 'approximate' : photo.location_precision
    });
    if (error) {
        if (message) message.textContent = error.message || '사진 정보를 저장하지 못했습니다.';
        return;
    }

    const updated = normalizeSavedPhoto(data || { ...photo, description, visibility, shared: visibility === 'public' });
    state.savedPhotos = state.savedPhotos.map((savedPhoto) => savedPhoto.id === updated.id ? updated : savedPhoto);
    setExplorePreviewEditMode(false);
    renderSavedPhotoSurfaces();
    renderTravelDraftSurfaces();
    renderPublicSurfaces();
    updateExplorePhotoPreview(updated);
    document.body.classList.add('explore-pin-selected');
    $('#explore-pin-preview')?.removeAttribute('hidden');
    updatePhotoDetailModal(updated, { context: 'explore' });
    showToast('사진 정보를 저장했습니다.');
}

function updateExploreAlbumPreview(album) {
    const preview = $('#explore-pin-preview');
    if (!preview || !album) return;
    const image = preview.querySelector('img');
    const story = preview.querySelector('.pin-preview-story p');
    const meta = preview.querySelector('.pin-preview-meta');
    const tripButton = preview.querySelector('[data-go-trip]');
    const profileButton = preview.querySelector('[data-go-profile]');
    if (image) {
        image.src = album.cover_url || MAIN_BG_2_URL;
        image.alt = album.title || 'Public album';
    }
    if (story) {
        const albumNote = getAlbumVisibleNote(album);
        story.textContent = albumNote || '앨범에 대한 글이 아직 없습니다.';
        story.classList.toggle('is-empty', !albumNote);
    }
    if (meta) {
        meta.innerHTML = `
            <span><span class="material-symbols-outlined">auto_stories</span> ${formatPhotoCount(album.photo_count || 0)}</span>
            <span><span class="material-symbols-outlined">place</span> ${formatPlaceCount(album.places || 0)}</span>
            <span><span class="material-symbols-outlined">public</span> ${album.visibility === 'link' ? 'Link' : 'Public'}</span>
        `;
    }
    if (tripButton) tripButton.dataset.publicAlbumId = album.id || '';
    if (profileButton) {
        profileButton.dataset.publicAlbumId = album.id || '';
        profileButton.dataset.publicOwnerId = album.owner_id || '';
    }
}

function getExploreCurrentBounds() {
    return normalizeExploreBounds(state.exploreMap?.getBounds?.());
}

function setExploreDiscoveryCollapsed(nextCollapsed) {
    state.isExploreDiscoveryCollapsed = Boolean(nextCollapsed);
    const panel = $('#explore-list');
    const button = $('#btn-toggle-explore-discovery');
    const icon = button?.querySelector('.material-symbols-outlined');

    panel?.classList.toggle('is-collapsed', state.isExploreDiscoveryCollapsed);
    if (button) {
        button.setAttribute('aria-expanded', String(!nextCollapsed));
        button.setAttribute('aria-label', nextCollapsed ? '탐색 패널 열기' : '탐색 패널 접기');
    }
    if (icon) {
        icon.textContent = nextCollapsed ? 'chevron_left' : 'chevron_right';
    }
}

function setExploreMobileDiscoveryOpen(isOpen) {
    state.isExploreMobileDiscoveryOpen = Boolean(isOpen);
    const panel = $('#explore-list');
    const mobileButton = $('#btn-toggle-explore-mobile-list');
    const desktopButton = $('#btn-toggle-explore-discovery');
    const desktopIcon = desktopButton?.querySelector('.material-symbols-outlined');
    const title = $('#explore-discovery-title');

    panel?.classList.toggle('is-mobile-open', state.isExploreMobileDiscoveryOpen);
    document.body.classList.toggle('explore-mobile-discovery-open', state.isExploreMobileDiscoveryOpen);
    if (mobileButton) {
        mobileButton.setAttribute('aria-expanded', String(state.isExploreMobileDiscoveryOpen));
        mobileButton.setAttribute('aria-label', state.isExploreMobileDiscoveryOpen ? '사진 목록 닫기' : '사진 목록 열기');
    }
    if (title) title.textContent = state.isExploreMobileDiscoveryOpen ? '사진 목록' : '탐색';
    if (desktopButton) {
        desktopButton.setAttribute('aria-expanded', String(state.isExploreMobileDiscoveryOpen || !state.isExploreDiscoveryCollapsed));
        desktopButton.setAttribute('aria-label', state.isExploreMobileDiscoveryOpen
            ? '사진 목록 닫기'
            : (state.isExploreDiscoveryCollapsed ? '탐색 패널 열기' : '탐색 패널 접기'));
    }
    if (desktopIcon) {
        desktopIcon.textContent = state.isExploreMobileDiscoveryOpen
            ? 'keyboard_arrow_down'
            : (state.isExploreDiscoveryCollapsed ? 'chevron_left' : 'chevron_right');
    }
    if (state.isExploreMobileDiscoveryOpen) {
        state.isExplorePhotoScopeMenuOpen = false;
        renderExplorePhotoScopeControls();
    }
}

function isExploreMobileViewport() {
    return window.matchMedia('(max-width: 860px)').matches;
}

function getExploreCurrentMapPadding() {
    const mapCanvas = $('.explore-map-canvas');
    const panel = $('#explore-list');
    return getExploreMapFitPadding({
        isMobile: isExploreMobileViewport(),
        isDrawerOpen: state.isExploreMobileDiscoveryOpen,
        viewportHeight: mapCanvas?.clientHeight || window.innerHeight,
        drawerHeight: state.isExploreMobileDiscoveryOpen ? panel?.getBoundingClientRect?.().height : 0
    });
}

function refreshExploreViewportForMobilePanel() {
    if (document.body.dataset.page !== APP_SECTIONS.EXPLORE || !state.exploreMarkerPhotos.length) return;
    state.exploreLastBoundsKey = null;
    state.explorePreserveViewportOnce = false;
    window.requestAnimationFrame(() => {
        if (document.body.dataset.page !== APP_SECTIONS.EXPLORE) return;
        renderExploreMapMarkers(state.exploreMarkerPhotos, state.exploreSelectedAlbumId);
    });
}

function toggleExploreMobileDiscoveryPanel() {
    setExploreMobileDiscoveryOpen(!state.isExploreMobileDiscoveryOpen);
    refreshExploreViewportForMobilePanel();
}

function toggleExploreDiscoveryPanel() {
    if (state.isExploreMobileDiscoveryOpen) {
        toggleExploreMobileDiscoveryPanel();
        return;
    }
    const panel = $('#explore-list');
    const nextCollapsed = !panel?.classList.contains('is-collapsed');
    setExploreDiscoveryCollapsed(nextCollapsed);
}

function renderExploreDiscoveryPanel(photos, options = {}) {
    const panel = $('#explore-list');
    const list = panel?.querySelector('[data-explore-discovery-list]');
    if (!panel || !list) return;
    setExploreDiscoveryCollapsed(state.isExploreDiscoveryCollapsed);
    setExploreMobileDiscoveryOpen(state.isExploreMobileDiscoveryOpen);

    const discoveryLimit = isExploreMobileViewport() ? 20 : 30;
    const visiblePhotos = getExploreDiscoveryPhotos(photos, {
        bounds: options.bounds || getExploreCurrentBounds(),
        limit: discoveryLimit
    });
    panel.dataset.visibleCount = String(visiblePhotos.length);

    if (!visiblePhotos.length) {
        list.innerHTML = '<p class="explore-discovery-empty">현재 지도 화면 안에 표시할 공개 사진이 없습니다.</p>';
        return;
    }

    list.innerHTML = visiblePhotos.map((photo) => {
        const description = getPhotoDescriptionText(photo);
        const label = getPhotoFallbackLabel(photo, photo.albumTitle || '공개 사진');
        const selected = photo.id && photo.id === state.selectedPhotoId ? ' is-selected' : '';
        return `
            <article class="explore-discovery-item${selected}" role="button" tabindex="0" data-explore-discovery-photo="${escapeHtml(photo.id || '')}" aria-label="${escapeHtml(description || label)} 사진 보기">
                <span class="explore-discovery-image">
                    ${renderPhotoImage(photo, label, { fetchPriority: 'low' })}
                </span>
            </article>
        `;
    }).join('');
}

async function getGoogleMapsRuntimeConfig() {
    if (state.googleMapsApiKey !== null && state.googleMapsMapId !== null) {
        return { apiKey: state.googleMapsApiKey, mapId: state.googleMapsMapId };
    }
    if (state.googleMapsConfigPromise) return state.googleMapsConfigPromise;

    const localConfig = normalizeGoogleMapsRuntimeConfig({
        googleMapsApiKey: window.GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        googleMapsMapId: window.GOOGLE_MAPS_MAP_ID || import.meta.env.VITE_GOOGLE_MAPS_MAP_ID
    });
    if (localConfig.apiKey) {
        state.googleMapsApiKey = localConfig.apiKey;
        state.googleMapsMapId = localConfig.mapId;
        return localConfig;
    }

    state.googleMapsConfigPromise = fetch('/api/config', { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : null))
        .then((config) => {
            const normalizedConfig = normalizeGoogleMapsRuntimeConfig(config);
            state.googleMapsApiKey = normalizedConfig.apiKey;
            state.googleMapsMapId = normalizedConfig.mapId;
            return normalizedConfig;
        })
        .catch(() => {
            state.googleMapsApiKey = '';
            state.googleMapsMapId = '';
            return { apiKey: '', mapId: '' };
        })
        .finally(() => {
            state.googleMapsConfigPromise = null;
        });

    return state.googleMapsConfigPromise;
}

function loadGoogleMapsApi() {
    if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
    if (state.exploreMapLoadPromise) return state.exploreMapLoadPromise;

    state.exploreMapLoadPromise = getGoogleMapsRuntimeConfig().then(({ apiKey }) => {
        if (!apiKey) return null;

        return new Promise((resolve, reject) => {
            const callbackName = `initIkkyeeGoogleMap${Date.now()}`;
            window[callbackName] = () => {
                resolve(window.google.maps);
                delete window[callbackName];
            };
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,marker&loading=async&callback=${callbackName}`;
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
        renderMapUnavailable(container);
        return null;
    }

    state.exploreMap = new maps.Map(container, getExploreMapOptions({
        center: { lat: 36.45, lng: 127.85 },
        zoom: state.exploreZoom,
        mapId: state.googleMapsMapId
    }));
    const map = state.exploreMap;
    map.addListener('click', () => clearExplorePinSelection());
    state.exploreMap.addListener('idle', () => {
        if (
            document.body.dataset.page === APP_SECTIONS.EXPLORE
            && state.exploreMarkerPhotos.length
        ) {
            renderExploreDiscoveryPanel(state.exploreMarkerPhotos);
        }
        const settledZoom = Number(map.getZoom?.());
        const hasPendingMarkerRefresh = Boolean(
            state.exploreMarkerIdleListener
            || state.exploreMarkerIdleTimer
            || state.exploreZoomIdleListener
            || state.exploreMarkerRefreshTimer
        );
        if (
            document.body.dataset.page === APP_SECTIONS.EXPLORE
            && state.exploreMarkerPhotos.length
            && Number.isFinite(settledZoom)
            && state.exploreRenderedZoom !== null
            && settledZoom !== state.exploreRenderedZoom
            && !hasPendingMarkerRefresh
            && !state.isExploreMapCameraAnimating
        ) {
            renderExploreMapMarkers(state.exploreMarkerPhotos, state.exploreSelectedAlbumId);
        }
    });

    const scheduleMapResize = () => {
        if (document.body.dataset.page !== APP_SECTIONS.EXPLORE) return;
        if (state.exploreMapResizeTimer) window.clearTimeout(state.exploreMapResizeTimer);
        state.exploreMapResizeTimer = window.setTimeout(() => {
            state.exploreMapResizeTimer = null;
            if (document.body.dataset.page !== APP_SECTIONS.EXPLORE) return;
            maps.event.trigger(map, 'resize');
        }, 80);
    };
    if (typeof ResizeObserver === 'function') {
        state.exploreMapResizeObserver?.disconnect?.();
        state.exploreMapResizeObserver = new ResizeObserver(scheduleMapResize);
        state.exploreMapResizeObserver.observe(container);
    } else {
        window.addEventListener('resize', scheduleMapResize, { passive: true });
    }
    window.visualViewport?.addEventListener('resize', scheduleMapResize, { passive: true });

    const input = $('#explore-map-search-input');
    const searchForm = $('#explore-map-search');
    const newAutocomplete = state.googleMapsMapId
        ? mountGoogleMapsPlaceAutocomplete({
            maps,
            map,
            input,
            onError: () => showToast('검색 결과를 찾지 못했습니다.')
        })
        : null;
    if (newAutocomplete) {
        state.exploreAutocomplete = newAutocomplete;
        searchForm?.classList.add('uses-place-autocomplete');
    } else if (input && maps.places?.Autocomplete) {
        state.exploreAutocomplete = new maps.places.Autocomplete(input, { fields: ['geometry', 'name'] });
        state.exploreAutocomplete.addListener('place_changed', () => {
            const place = state.exploreAutocomplete.getPlace();
            if (!place?.geometry?.location) return;
            state.exploreMap.panTo(place.geometry.location);
            state.exploreMap.setZoom(13);
        });
    }
    return state.exploreMap;
}

function getExplorePinIcon(maps, options = {}) {
    return getExplorePinSymbolIcon(maps, options);
}

function setExploreMarkerLoading(isLoading) {
    state.isExploreMarkerLoading = Boolean(isLoading);
    $('.explore-map-canvas')?.classList.toggle('is-loading-pins', state.isExploreMarkerLoading);
    const loadingMessage = $('.explore-map-pin-loading');
    if (loadingMessage) loadingMessage.hidden = !state.isExploreMarkerLoading;
}

function clearExploreMapMarkers() {
    state.exploreMarkers.forEach((marker) => marker.setMap(null));
    state.exploreMarkers = [];
    state.exploreRenderedZoom = null;
}

function mountExploreMapMarkers(renderState) {
    const { maps, map, clusters, locatedPhotos, currentZoom } = renderState;
    const previousMarkers = state.exploreMarkers;
    const nextMarkers = clusters.map((cluster) => {
        if (cluster.count === 1) {
            const [photo] = cluster.photos;
            const selected = Boolean(photo.id && photo.id === state.selectedPhotoId);
            const marker = createGoogleMapsMarker(maps, {
                map,
                position: cluster.position || { lat: Number(photo.lat), lng: Number(photo.lng) },
                title: getPhotoFallbackLabel(photo, photo.albumTitle || '공개 사진'),
                icon: getExplorePinIcon(maps, { type: 'photo', selected }),
                label: null,
                zIndex: selected ? 1000 : 10
            }, { mapId: state.googleMapsMapId });
            marker.addListener('click', () => {
                openExplorePhotoPreview(photo, { focusMap: false });
            });
            return marker;
        }

        const marker = createGoogleMapsMarker(maps, {
            map,
            position: cluster.position,
            title: `이 지역 공개 사진 ${formatPhotoCount(cluster.count)}`,
            icon: getExplorePinIcon(maps, { type: 'cluster' }),
            label: null,
            zIndex: 20 + Math.min(cluster.count, 99)
        }, { mapId: state.googleMapsMapId });
        marker.addListener('click', () => {
            state.selectedPublicAlbumId = null;
            state.selectedPhotoId = null;
            setExploreDiscoverySelection(null);
            setExplorePreviewExpanded(false);
            document.body.classList.remove('explore-pin-selected');
            $('#explore-pin-preview')?.setAttribute('hidden', '');
            const mapRect = map.getDiv?.().getBoundingClientRect?.();
            const targetViewport = getExploreMarkerExpansionViewport(cluster.photos, map.getZoom?.() || currentZoom, {
                radiusPx: 54,
                separationPaddingPx: 28,
                edgePaddingPx: 112,
                width: mapRect?.width,
                height: mapRect?.height,
                maxZoom: 21
            });
            setExploreMarkerLoading(true);
            state.isExploreMapCameraAnimating = true;
            animateExploreMapCamera(map, {
                center: targetViewport.center || cluster.position,
                zoom: targetViewport.zoom
            }).finally(() => {
                state.isExploreMapCameraAnimating = false;
                if (!shouldPreserveExploreViewport(cluster.photos, normalizeExploreBounds(map.getBounds?.()))) {
                    const photoBounds = new maps.LatLngBounds();
                    cluster.photos.forEach((photo) => {
                        photoBounds.extend({ lat: Number(photo.lat), lng: Number(photo.lng) });
                    });
                    map.fitBounds(photoBounds, 112);
                }
                scheduleExploreMarkerRefreshAfterIdle(maps, map);
            });
        });
        return marker;
    });

    const selectedPhoto = locatedPhotos.find((photo) => photo.id === state.selectedPhotoId);
    const selectedPhotoHasVisibleMarker = clusters.some((cluster) => (
        cluster.count === 1
        && cluster.photos.some((photo) => photo.id === state.selectedPhotoId)
    ));
    if (selectedPhoto && !selectedPhotoHasVisibleMarker) {
        const selectedMarker = createGoogleMapsMarker(maps, {
            map,
            position: { lat: Number(selectedPhoto.lat), lng: Number(selectedPhoto.lng) },
            title: getPhotoFallbackLabel(selectedPhoto, selectedPhoto.albumTitle || '공개 사진'),
            icon: getExplorePinIcon(maps, { type: 'photo', selected: true }),
            label: null,
            zIndex: 1000
        }, { mapId: state.googleMapsMapId });
        selectedMarker.addListener('click', () => {
            openExplorePhotoPreview(selectedPhoto, { focusMap: false });
        });
        nextMarkers.push(selectedMarker);
    }
    state.exploreMarkers = nextMarkers;
    state.exploreRenderedZoom = Number(currentZoom);
    previousMarkers.forEach((marker) => marker.setMap(null));
}

function bindExploreClusterRefresh(maps, map) {
    if (state.exploreClusterListenerMap === map && state.exploreClusterListener) return;
    state.exploreClusterListener?.remove?.();
    state.exploreClusterListenerMap = map;
    state.exploreClusterListener = map.addListener('zoom_changed', () => {
        if (state.isExploreMapCameraAnimating) return;
        scheduleExploreMarkerRefreshAfterIdle(maps, map);
    });
}

function scheduleExploreMarkerRefreshAfterIdle(maps, map) {
    if (!state.exploreMarkerPhotos.length) return;
    setExploreMarkerLoading(true);
    state.exploreZoomIdleListener?.remove?.();
    if (state.exploreMarkerRefreshTimer) window.clearTimeout(state.exploreMarkerRefreshTimer);
    let refreshed = false;
    const refresh = () => {
        if (refreshed) return;
        refreshed = true;
        state.exploreZoomIdleListener?.remove?.();
        state.exploreZoomIdleListener = null;
        if (state.exploreMarkerRefreshTimer) window.clearTimeout(state.exploreMarkerRefreshTimer);
        state.exploreMarkerRefreshTimer = null;
        renderExploreMapMarkers(state.exploreMarkerPhotos, state.exploreSelectedAlbumId);
    };
    state.exploreZoomIdleListener = maps.event.addListenerOnce(map, 'idle', refresh);
    state.exploreMarkerRefreshTimer = window.setTimeout(refresh, 320);
}

function scheduleExploreMarkerMountAfterViewport(maps, map, {
    renderToken,
    locatedPhotos,
    renderDiscovery = false
}) {
    state.exploreMarkerIdleListener?.remove?.();
    if (state.exploreMarkerIdleTimer) window.clearTimeout(state.exploreMarkerIdleTimer);

    let mounted = false;
    const mount = () => {
        if (mounted) return;
        mounted = true;
        state.exploreMarkerIdleListener?.remove?.();
        state.exploreMarkerIdleListener = null;
        if (state.exploreMarkerIdleTimer) window.clearTimeout(state.exploreMarkerIdleTimer);
        state.exploreMarkerIdleTimer = null;
        if (renderToken !== state.exploreMarkerRenderToken) return;

        const settledZoom = map.getZoom?.() || state.exploreZoom;
        const clusters = getExploreMarkerClusters(locatedPhotos, settledZoom, 54);
        mountExploreMapMarkers({ maps, map, clusters, locatedPhotos, currentZoom: settledZoom });
        if (renderDiscovery) renderExploreDiscoveryPanel(locatedPhotos);
        setExploreMarkerLoading(false);
    };

    state.exploreMarkerIdleListener = maps.event.addListenerOnce(map, 'idle', mount);
    state.exploreMarkerIdleTimer = window.setTimeout(mount, 480);
}

async function renderExploreMapMarkers(locatedPhotos, selectedAlbumId) {
    const renderToken = ++state.exploreMarkerRenderToken;
    const map = await ensureExploreMap();
    const maps = window.google?.maps;
    if (renderToken !== state.exploreMarkerRenderToken) return;
    if (!map || !maps) {
        setExploreMarkerLoading(false);
        return;
    }

    state.exploreMarkerPhotos = locatedPhotos;
    state.exploreSelectedAlbumId = selectedAlbumId;
    if (!locatedPhotos.length) {
        clearExploreMapMarkers();
        setExploreMarkerLoading(false);
        document.body.classList.remove('explore-pin-selected');
        setExplorePreviewExpanded(false);
        $('#explore-pin-preview')?.setAttribute('hidden', '');
        renderExploreDiscoveryPanel([]);
        return;
    }
    renderExploreDiscoveryPanel(locatedPhotos);
    const currentZoom = map.getZoom?.() || state.exploreZoom;
    bindExploreClusterRefresh(maps, map);

    const viewportAction = getExploreViewportAction(locatedPhotos, state.exploreLastBoundsKey, {
        preserveViewport: state.explorePreserveViewportOnce
    });
    const mapPadding = getExploreCurrentMapPadding();
    state.explorePreserveViewportOnce = false;
    state.exploreLastBoundsKey = viewportAction.boundsKey;
    if (viewportAction.type === 'focus') {
        setExploreMarkerLoading(true);
        scheduleExploreMarkerMountAfterViewport(maps, map, {
            renderToken,
            locatedPhotos,
            renderDiscovery: true
        });
        map.setCenter(viewportAction.center);
        map.setZoom(13);
        const focusPanY = getExploreMapFocusPanY(mapPadding);
        if (focusPanY) window.requestAnimationFrame(() => map.panBy(0, focusPanY));
        return;
    }
    if (viewportAction.type === 'fit') {
        const bounds = new maps.LatLngBounds();
        locatedPhotos.forEach((photo) => bounds.extend({ lat: Number(photo.lat), lng: Number(photo.lng) }));
        setExploreMarkerLoading(true);
        scheduleExploreMarkerMountAfterViewport(maps, map, {
            renderToken,
            locatedPhotos
        });
        map.fitBounds(bounds, mapPadding);
        return;
    }
    const clusters = getExploreMarkerClusters(locatedPhotos, currentZoom, 54);
    mountExploreMapMarkers({ maps, map, clusters, locatedPhotos, currentZoom });
    setExploreMarkerLoading(false);
}

async function ensureProfileMap() {
    const container = $('#profile-map');
    if (!container) return null;
    if (state.profileMap) return state.profileMap;

    const maps = await loadGoogleMapsApi();
    if (!maps) {
        renderMapUnavailable(container);
        return null;
    }

    state.profileMap = new maps.Map(container, getExploreMapOptions({
        center: { lat: 36.45, lng: 127.85 },
        zoom: 7,
        mapId: state.googleMapsMapId
    }));
    return state.profileMap;
}

async function renderProfileMap(photos = []) {
    const renderToken = ++state.profileMapRenderToken;
    const map = await ensureProfileMap();
    const maps = window.google?.maps;
    if (renderToken !== state.profileMapRenderToken) return;
    if (!map || !maps) return;

    state.profileMarkers.forEach((marker) => marker.setMap(null));
    state.profileMarkers = [];
    const locatedPhotos = photos.filter(hasPhotoLocation);
    if (!locatedPhotos.length) return;

    state.profileMarkers = locatedPhotos.map((photo) => createGoogleMapsMarker(maps, {
        map,
        position: { lat: Number(photo.lat), lng: Number(photo.lng) },
        title: getPhotoFallbackLabel(photo, '공개 사진'),
        icon: getExplorePinIcon(maps, { type: 'photo' }),
        label: null,
        zIndex: 10
    }, { mapId: state.googleMapsMapId }));

    const bounds = new maps.LatLngBounds();
    locatedPhotos.forEach((photo) => bounds.extend({ lat: Number(photo.lat), lng: Number(photo.lng) }));
    map.fitBounds(bounds, 96);
}

function clearPhotoDetailMapMarkers() {
    state.photoDetailMarkers.forEach((marker) => marker.setMap?.(null));
    state.photoDetailMarkers = [];
}

function getPhotoDetailMapCandidates() {
    const publicAlbumPhotos = getPublicAlbums().flatMap((album) => album.photos || []);
    return [
        ...getAllDisplayPhotos(),
        ...state.albumDetailPhotos,
        ...publicAlbumPhotos,
        ...getLandingPublicPhotos()
    ];
}

async function renderPhotoDetailMap(photo) {
    const renderToken = ++state.photoDetailMapRenderToken;
    const mapShell = $('#photo-detail-map');
    const mapCanvas = $('#photo-detail-map-canvas');
    const viewport = getPhotoDetailMapViewport(photo);
    const mapItems = getPhotoDetailOwnerMapItems(
        photo,
        getPhotoDetailMapCandidates(),
        state.currentUser?.id || ''
    );
    const selectedItem = mapItems.find((item) => item.isSelected);

    clearPhotoDetailMapMarkers();
    if (!mapShell || !mapCanvas || !viewport || !selectedItem) {
        mapShell?.setAttribute('hidden', '');
        return;
    }

    mapShell.removeAttribute('hidden');
    mapCanvas.setAttribute('aria-label', `올린 사람의 사진 위치 ${mapItems.length}개가 표시된 지도`);
    const maps = await loadGoogleMapsApi();
    if (renderToken !== state.photoDetailMapRenderToken) return;
    if (!maps) {
        renderMapUnavailable(mapCanvas);
        return;
    }

    if (!state.photoDetailMap) {
        mapCanvas.replaceChildren();
        state.photoDetailMap = new maps.Map(mapCanvas, getExploreMapOptions({
            ...viewport,
            mapId: state.googleMapsMapId
        }));
    } else {
        state.photoDetailMap.setCenter(viewport.center);
        state.photoDetailMap.setZoom(viewport.zoom);
    }

    state.photoDetailMarkers = mapItems.map((item) => createGoogleMapsMarker(maps, {
        map: state.photoDetailMap,
        position: { lat: Number(item.lat), lng: Number(item.lng) },
        title: getPhotoFallbackLabel(item, '사진 위치'),
        icon: getExplorePinIcon(maps, { type: 'photo', selected: item.isSelected }),
        label: null,
        zIndex: item.isSelected ? 100 : 10
    }, { mapId: state.googleMapsMapId }));

    window.requestAnimationFrame(() => {
        if (renderToken !== state.photoDetailMapRenderToken || !state.photoDetailMap) return;
        maps.event?.trigger?.(state.photoDetailMap, 'resize');
        state.photoDetailMap.setCenter(viewport.center);
        state.photoDetailMap.setZoom(viewport.zoom);
    });
}

function updatePhotoDetailModal(photo = getDefaultDetailPhoto(), { context = 'photo' } = {}) {
    state.selectedPhotoId = photo.id || null;
    const modal = $('#photo-detail-modal');
    const image = modal?.querySelector('[data-photo-detail-image]');
    const descriptionNode = $('#photo-detail-description');
    const dateMeta = modal?.querySelector('[data-photo-detail-meta="date"]');
    const placeMeta = modal?.querySelector('[data-photo-detail-meta="place"]');
    const aiAnalysisPanel = $('#photo-detail-ai-analysis');
    const aiAnalysisStatus = $('#photo-detail-ai-status');
    const aiAnalysisSummary = $('#photo-detail-ai-summary');
    const aiAnalysisTags = $('#photo-detail-ai-tags');
    const authorButton = $('#photo-detail-author');
    const authorImage = $('#photo-detail-author-image');
    const authorFallback = $('#photo-detail-author-fallback');
    const authorName = $('#photo-detail-author-name');
    const streetViewSection = $('#photo-detail-street-view');
    const streetViewPreview = $('#photo-detail-street-view-preview');
    const streetViewStaticImage = $('#photo-detail-street-view-static');
    const streetViewCanvas = $('#photo-detail-street-view-canvas');
    const streetViewMessage = $('#photo-detail-street-view-message');
    const streetViewButton = $('#btn-load-street-view');
    const visibilityValue = $('#photo-detail-visibility');
    const likePanel = modal?.querySelector('.photo-detail-like-panel');
    const likeButton = $('#photo-detail-like');
    const likeCount = $('#photo-detail-like-count');
    const editButton = modal?.querySelector('[data-open-photo-editor]');
    const showOnMapButton = modal?.querySelector('[data-show-photo-on-map]');
    const reportButton = modal?.querySelector('[data-report-photo]');
    const description = String(photo.description || '').trim();
    const date = photo.date ? new Date(photo.date) : null;
    const canEdit = Boolean(state.currentUser?.id && photo.owner_id === state.currentUser.id);
    const canLike = ['photo', 'explore', 'liked'].includes(context);
    const isLiked = Boolean(photo.id && state.likedPhotoIds.includes(String(photo.id)));
    const likeTotal = Number(photo.liked || 0);
    const dateLabel = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '-- --';
    const placeName = String(photo.placeName || '').trim();
    const ownerId = String(photo.owner_id || '');
    const authorProfile = getPublicProfileDetails(ownerId);
    const photoImageSrc = getPhotoImageSrc(photo);
    const locationLabel = placeName || (hasPhotoLocation(photo)
        ? `${Number(photo.lat).toFixed(4)}, ${Number(photo.lng).toFixed(4)}`
        : '위치 정보 없음');
    const googleMapsLocationUrl = getGoogleMapsLocationUrl(photo.lat, photo.lng);

    if (modal) {
        modal.dataset.photoDetailContext = context;
        modal.dataset.photoDetailImageSrc = photoImageSrc;
        modal.dataset.photoDetailImageFallbackSrc = getPhotoImageFallbackSrc(photo, photoImageSrc);
        modal.dataset.photoDetailImageAlt = description || '여행 사진 상세';
    }
    if (image) {
        setImageSourceWithFallback(image, photoImageSrc, getPhotoImageFallbackSrc(photo, photoImageSrc));
        image.alt = description || '여행 사진 상세';
    }
    const mediaColumn = modal?.querySelector('.photo-detail-media-column');
    if (mediaColumn) mediaColumn.scrollTop = 0;
    if (descriptionNode) {
        descriptionNode.textContent = description;
        descriptionNode.hidden = !description;
    }
    if (dateMeta) dateMeta.innerHTML = `<span class="material-symbols-outlined">calendar_today</span> ${dateLabel}`;
    if (placeMeta) {
        placeMeta.innerHTML = `<span class="material-symbols-outlined">place</span> ${locationLabel}`;
        placeMeta.classList.toggle('is-link', Boolean(googleMapsLocationUrl));
        if (googleMapsLocationUrl) {
            placeMeta.href = googleMapsLocationUrl;
            placeMeta.tabIndex = 0;
            placeMeta.removeAttribute('aria-disabled');
            placeMeta.setAttribute('aria-label', `${locationLabel} Google 지도에서 열기`);
        } else {
            placeMeta.removeAttribute('href');
            placeMeta.tabIndex = -1;
            placeMeta.setAttribute('aria-disabled', 'true');
            placeMeta.removeAttribute('aria-label');
        }
    }
    if (aiAnalysisPanel) {
        const analysisStatus = photo.ai_analysis_status || 'pending';
        const isComplete = photo.ai_analysis_status === 'complete';
        const statusLabels = {
            complete: 'AI 분석 완료',
            failed: 'AI 분석 실패',
            pending: 'AI 분석 대기',
            processing: 'AI 분석 중'
        };
        aiAnalysisPanel.hidden = !canEdit;
        aiAnalysisPanel.classList.toggle('is-complete', isComplete);
        aiAnalysisPanel.classList.toggle('is-failed', analysisStatus === 'failed');
        if (aiAnalysisStatus) aiAnalysisStatus.textContent = statusLabels[analysisStatus] || statusLabels.pending;
        if (aiAnalysisSummary) {
            aiAnalysisSummary.textContent = isComplete ? String(photo.ai_summary || '') : '';
            aiAnalysisSummary.hidden = !isComplete || !photo.ai_summary;
        }
        if (aiAnalysisTags) {
            const tags = isComplete && Array.isArray(photo.ai_tags) ? photo.ai_tags : [];
            aiAnalysisTags.replaceChildren(...tags.map((tag) => {
                const chip = document.createElement('span');
                chip.textContent = tag;
                return chip;
            }));
            aiAnalysisTags.hidden = !tags.length;
        }
    }
    if (authorButton) {
        authorButton.hidden = !ownerId;
        authorButton.dataset.publicOwnerId = ownerId;
        authorButton.dataset.publicAlbumId = String(photo.album_id || '');
    }
    if (authorName) authorName.textContent = authorProfile.nickname;
    setAvatarDisplay(authorImage, authorFallback, authorProfile.avatarUrl, authorProfile.nickname);
    void renderPhotoDetailMap(photo);
    state.photoDetailStreetView = null;
    if (streetViewPreview) {
        streetViewPreview.hidden = true;
        streetViewPreview.classList.remove('is-fallback');
    }
    if (streetViewStaticImage) streetViewStaticImage.removeAttribute('src');
    if (streetViewCanvas) {
        streetViewCanvas.hidden = true;
        streetViewCanvas.replaceChildren();
    }
    if (streetViewMessage) streetViewMessage.textContent = '';
    const canShowStreetView = hasPhotoLocation(photo) && normalizeLocationPrecision(photo.location_precision) === 'exact';
    if (streetViewSection) {
        streetViewSection.classList.remove('is-unavailable');
        streetViewSection.hidden = !canShowStreetView;
        streetViewSection.dataset.lat = canShowStreetView ? String(photo.lat) : '';
        streetViewSection.dataset.lng = canShowStreetView ? String(photo.lng) : '';
    }
    if (streetViewButton) {
        streetViewButton.disabled = false;
        setPhotoDetailStreetViewButtonLabel('스트리트뷰 보기');
    }
    if (canShowStreetView) renderPhotoDetailStreetViewPreview(photo);
    if (visibilityValue) {
        const isPublicPhoto = photo.shared || photo.visibility === 'public';
        visibilityValue.hidden = !canEdit;
        visibilityValue.innerHTML = `<span class="material-symbols-outlined">${isPublicPhoto ? 'public' : 'lock'}</span> ${isPublicPhoto ? '공개' : '비공개'}`;
    }
    if (likePanel) likePanel.hidden = !canLike;
    if (likeButton) {
        likeButton.disabled = !canLike || !photo.id || !state.currentUser;
        likeButton.classList.toggle('is-liked', isLiked);
        likeButton.setAttribute('aria-pressed', isLiked ? 'true' : 'false');
        likeButton.dataset.photoId = photo.id || '';
        likeButton.setAttribute('aria-label', isLiked ? '좋아요 취소' : '좋아요');
    }
    if (likeCount) likeCount.textContent = String(likeTotal);
    if (editButton) editButton.hidden = !canEdit;
    if (showOnMapButton) {
        const canShowOnExploreMap = Boolean(photo?.id && hasPhotoLocation(photo));
        showOnMapButton.hidden = !canShowOnExploreMap;
        showOnMapButton.dataset.photoId = canShowOnExploreMap ? String(photo.id || photo.localId) : '';
    }
    if (reportButton) reportButton.dataset.photoId = photo.id || '';
    setPhotoDetailMoreMenuOpen(false);
    window.requestAnimationFrame(syncPhotoDetailScrollCue);
}

function syncPhotoDetailScrollCue() {
    const modal = $('#photo-detail-modal');
    const mediaColumn = $('#photo-detail-modal .photo-detail-media-column');
    const cue = $('[data-photo-detail-scroll-cue]');
    if (!mediaColumn || !cue) return;
    const scrollContainer = window.matchMedia('(max-width: 760px)').matches
        ? modal?.querySelector('.photo-detail-card')
        : mediaColumn;
    if (!scrollContainer) return;
    const remainingScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight - scrollContainer.scrollTop;
    cue.classList.toggle('is-hidden', scrollContainer.scrollHeight <= scrollContainer.clientHeight + 8 || remainingScroll <= 10);
}

function setPhotoDetailStreetViewButtonLabel(label) {
    const labelNode = $('#btn-load-street-view span:last-child');
    if (labelNode) labelNode.textContent = label;
}

async function renderPhotoDetailStreetViewPreview(photo) {
    const section = $('#photo-detail-street-view');
    const preview = $('#photo-detail-street-view-preview');
    const image = $('#photo-detail-street-view-static');
    const message = $('#photo-detail-street-view-message');
    const lat = Number(photo?.lat);
    const lng = Number(photo?.lng);
    if (!section || !preview || !image || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

    if (message) message.textContent = '정적 거리뷰 미리보기를 불러오는 중입니다…';
    const { apiKey } = await getGoogleMapsRuntimeConfig();
    if (Number(section.dataset.lat) !== lat || Number(section.dataset.lng) !== lng) return;
    const imageUrl = getStreetViewStaticImageUrl({ lat, lng, apiKey });
    if (!imageUrl) {
        preview.classList.add('is-fallback');
        preview.hidden = false;
        if (message) message.textContent = '정적 미리보기를 표시할 수 없습니다. 버튼을 눌러 동적 거리뷰를 확인해 주세요.';
        window.requestAnimationFrame(syncPhotoDetailScrollCue);
        return;
    }

    image.onload = () => {
        if (message) message.textContent = '';
        syncPhotoDetailScrollCue();
    };
    image.onerror = () => {
        image.removeAttribute('src');
        preview.classList.add('is-fallback');
        if (message) message.textContent = '정적 미리보기를 표시할 수 없습니다. 버튼을 눌러 동적 거리뷰를 확인해 주세요.';
        syncPhotoDetailScrollCue();
    };
    preview.classList.remove('is-fallback');
    image.src = imageUrl;
    preview.hidden = false;
    window.requestAnimationFrame(syncPhotoDetailScrollCue);
}

async function loadPhotoDetailStreetView() {
    const section = $('#photo-detail-street-view');
    const preview = $('#photo-detail-street-view-preview');
    const canvas = $('#photo-detail-street-view-canvas');
    const button = $('#btn-load-street-view');
    const message = $('#photo-detail-street-view-message');
    const lat = Number(section?.dataset.lat);
    const lng = Number(section?.dataset.lng);
    if (!section || !canvas || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    section.classList.remove('is-unavailable');
    if (button) {
        button.disabled = true;
        setPhotoDetailStreetViewButtonLabel('거리뷰 확인 중…');
    }
    if (message) message.textContent = '';
    const maps = await loadGoogleMapsApi();
    if (!maps) {
        if (message) message.textContent = '현재 거리뷰를 불러올 수 없습니다.';
        if (button) {
            button.disabled = false;
            setPhotoDetailStreetViewButtonLabel('다시 시도');
        }
        return;
    }
    const service = new maps.StreetViewService();
    service.getPanorama({
        location: { lat, lng },
        radius: 80,
        source: maps.StreetViewSource.OUTDOOR,
        preference: maps.StreetViewPreference.NEAREST
    }, (data, status) => {
        if (status !== maps.StreetViewStatus.OK || !data?.location?.latLng) {
            canvas.hidden = true;
            if (preview) preview.hidden = true;
            section.classList.add('is-unavailable');
            if (message) message.textContent = '해당 위치에 거리뷰가 없습니다';
            return;
        }
        section.classList.remove('is-unavailable');
        canvas.hidden = false;
        if (preview) preview.hidden = true;
        state.photoDetailStreetView = new maps.StreetViewPanorama(canvas, {
            position: data.location.latLng,
            pov: { heading: 0, pitch: 0 },
            zoom: 0,
            addressControl: true,
            fullscreenControl: true
        });
        if (message) message.textContent = '사진 위치와 가장 가까운 거리뷰입니다.';
        syncPhotoDetailScrollCue();
    });
}

function playPhotoLikeSnap(button) {
    if (!button) return;
    button.classList.remove('is-snapping');
    void button.offsetWidth;
    button.classList.add('is-snapping');
    window.setTimeout(() => button.classList.remove('is-snapping'), 320);
}

function setPhotoDetailMoreMenuOpen(isOpen) {
    const button = $('[data-photo-detail-more]');
    const menu = $('[data-photo-detail-more-menu]');
    if (button) button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (menu) menu.hidden = !isOpen;
}

function openPhotoFullscreenFromDetail() {
    const detailModal = $('#photo-detail-modal');
    const sourceImage = detailModal?.querySelector('[data-photo-detail-image]');
    const fullscreenImage = $('[data-photo-fullscreen-image]');
    const renderedSource = sourceImage?.currentSrc || sourceImage?.src || '';
    const source = sourceImage?.dataset.fallbackApplied === 'true'
        ? renderedSource
        : detailModal?.dataset.photoDetailImageSrc || renderedSource || MAIN_BG_2_URL;
    const fallbackSource = detailModal?.dataset.photoDetailImageFallbackSrc || renderedSource || MAIN_BG_2_URL;
    const alt = sourceImage?.alt || detailModal?.dataset.photoDetailImageAlt || '여행 사진 크게보기';
    if (fullscreenImage) {
        setImageSourceWithFallback(fullscreenImage, source, fallbackSource);
        fullscreenImage.alt = alt;
    }
    setPhotoDetailMoreMenuOpen(false);
    openModal('#photo-fullscreen-modal');
    document.body.classList.add('photo-fullscreen-open');
}

async function toggleSelectedPhotoLike(eventOrPhotoId) {
    const photoId = typeof eventOrPhotoId === 'string'
        ? eventOrPhotoId
        : eventOrPhotoId?.currentTarget?.dataset?.photoId || state.selectedPhotoId;
    if (!state.currentUser) {
        openModal('#auth-modal');
        showToast('좋아요를 누르려면 먼저 로그인해주세요.');
        return;
    }
    const photo = getAllDisplayPhotos().find((candidate) => String(candidate.id) === String(photoId));
    if (!photo?.id) return;

    const likedIds = new Set(state.likedPhotoIds.map(String));
    const nextLiked = !likedIds.has(String(photo.id));
    const likeButton = eventOrPhotoId?.currentTarget || $('#photo-detail-like');
    playPhotoLikeSnap(likeButton);
    if (likeButton) likeButton.disabled = true;

    const { likedCount, error } = await setPhotoLike(photo.id, nextLiked);
    if (error) {
        if (likeButton) likeButton.disabled = false;
        showToast('좋아요 상태를 저장하지 못했습니다.');
        return;
    }

    state.likedPhotoIds = nextLiked
        ? [...likedIds, String(photo.id)]
        : [...likedIds].filter((id) => id !== String(photo.id));
    state.savedPhotos = state.savedPhotos.map((savedPhoto) => (
        String(savedPhoto.id) === String(photo.id)
            ? { ...savedPhoto, liked: likedCount }
            : savedPhoto
    ));
    const updatedPhoto = state.savedPhotos.find((candidate) => String(candidate.id) === String(photo.id));
    const detailContext = $('#photo-detail-modal')?.dataset.photoDetailContext || 'photo';
    renderLikedPhotoSurfaces();
    renderPublicSurfaces();
    if (state.selectedPhotoId && String(state.selectedPhotoId) === String(photo.id)) {
        if (detailContext === 'explore') {
            updateExplorePhotoPreview(updatedPhoto || photo);
        } else {
            updatePhotoDetailModal(updatedPhoto || photo, { context: detailContext });
        }
    }
    showToast(nextLiked ? '좋아요에 추가했습니다.' : '좋아요를 취소했습니다.');
}

function getCurrentAccountProfile() {
    const user = state.currentUser;
    const storedProfile = user?.id ? state.publicProfiles[user.id] || null : null;
    const profile = resolveAccountProfile(user, storedProfile);
    return {
        ...profile,
        nickname: state.profileNames[user?.id] || profile.nickname
    };
}

function getPublicProfileDetails(ownerId) {
    const publicProfile = ownerId ? state.publicProfiles[ownerId] || null : null;
    const isCurrentUser = Boolean(ownerId && state.currentUser?.id === ownerId);
    if (isCurrentUser) {
        const currentProfile = getCurrentAccountProfile();
        return {
            nickname: currentProfile.nickname,
            bio: currentProfile.bio,
            avatarUrl: currentProfile.avatarUrl
        };
    }

    const nickname = getPublicAuthorName({ owner_id: ownerId }, {
        currentUser: state.currentUser,
        profileNames: state.profileNames
    });
    const bio = String(publicProfile?.bio || '').trim();
    const avatarUrl = String(publicProfile?.avatar_url || publicProfile?.avatarUrl || '').trim();
    return { nickname, bio, avatarUrl };
}

function ensureProfileHeaderShell() {
    const profileCard = $('.profile-card');
    if (!profileCard || profileCard.querySelector('#profile-bio')) return;
    profileCard.innerHTML = `
        <div class="profile-card-copy">
            <div class="profile-card-topline">
                <div class="profile-title-row">
                    <label id="profile-avatar" class="avatar large-avatar account-profile-avatar profile-avatar-pick" for="profile-avatar-input" aria-label="프로필 이미지 변경">
                        <img id="profile-avatar-image" alt="" hidden>
                        <span id="profile-avatar-fallback" class="material-symbols-outlined avatar-fallback-icon" aria-hidden="true">person</span>
                    </label>
                    <h1 id="profile-title">Ikkyee</h1>
                </div>
                <div class="profile-owner-actions">
                    <button id="account-profile-logout" class="btn-secondary danger" type="button" hidden>로그아웃</button>
                    <button id="account-profile-edit" class="btn-secondary" type="button" hidden>수정하기</button>
                </div>
            </div>
            <div id="account-profile-view" class="account-profile-view profile-header-view">
                <p id="profile-bio" class="account-profile-bio" hidden></p>
                <div class="account-profile-metrics">
                    <span><strong id="profile-photo-count">0</strong> posts</span>
                    <span><strong id="profile-album-count">0</strong> albums</span>
                    <span><strong id="profile-public-count">0</strong> public</span>
                </div>
            </div>
            <form id="account-profile-form" class="account-profile-form profile-edit-form" hidden>
                <input id="profile-avatar-input" class="profile-avatar-file-input" type="file" accept="image/*" disabled>
                <div class="account-profile-fields">
                    <div class="account-profile-field profile-edit-name-field">
                        <label for="profile-nickname-input">닉네임</label>
                        <input id="profile-nickname-input" type="text" maxlength="40" placeholder="Ikkyee">
                    </div>
                    <div class="account-profile-field profile-edit-photo-field">
                        <span class="account-profile-field-label">프로필 사진</span>
                        <label class="profile-avatar-upload-control" for="profile-avatar-input">
                            <span class="profile-avatar-upload-preview" aria-hidden="true">
                                <img id="profile-avatar-upload-preview-image" alt="" hidden>
                                <span id="profile-avatar-upload-preview-fallback" class="material-symbols-outlined avatar-fallback-icon" aria-hidden="true">person</span>
                            </span>
                            <span class="material-symbols-outlined" aria-hidden="true">add_photo_alternate</span>
                            <span data-profile-avatar-upload-label>사진 추가</span>
                        </label>
                    </div>
                </div>
                <div class="auth-actions">
                    <button id="account-profile-save" class="btn-primary" type="submit">저장</button>
                    <button id="account-profile-cancel" class="btn-secondary" type="button">취소</button>
                </div>
                <p id="account-profile-message" class="auth-message"></p>
            </form>
        </div>
    `;
}

function setAvatarDisplay(imageNode, fallbackNode, avatarUrl, name) {
    if (!imageNode || !fallbackNode) return;
    const resolvedAvatarUrl = avatarUrl || defaultProfileAvatarUrl;
    fallbackNode.classList.add('material-symbols-outlined', 'avatar-fallback-icon');
    fallbackNode.setAttribute('aria-hidden', 'true');
    fallbackNode.textContent = 'person';
    imageNode.onerror = () => {
        imageNode.onerror = null;
        imageNode.src = defaultProfileAvatarUrl;
    };
    imageNode.src = resolvedAvatarUrl;
    imageNode.hidden = false;
    fallbackNode.hidden = true;
}

function clearAccountProfileAvatarPreview() {
    if (!state.accountProfileAvatarPreviewUrl) return;
    URL.revokeObjectURL(state.accountProfileAvatarPreviewUrl);
    state.accountProfileAvatarPreviewUrl = null;
}

function renderAccountProfilePanel() {
    ensureProfileHeaderShell();
    clearAccountProfileAvatarPreview();
    const profile = getCurrentAccountProfile();
    const photoCount = getMySavedPhotos().length;
    const albumCount = state.savedAlbums.filter((album) => album.owner_id === state.currentUser?.id).length;
    const publicCount = getMySavedPhotos().filter((photo) => photo.shared || photo.visibility === 'public').length;
    const title = $('#profile-title');
    const bio = $('#profile-bio');
    const photoCountNode = $('#profile-photo-count');
    const albumCountNode = $('#profile-album-count');
    const publicCountNode = $('#profile-public-count');

    if (title) title.textContent = profile.nickname;
    if (bio) {
        bio.textContent = profile.bio;
        bio.hidden = !profile.bio;
    }
    if (photoCountNode) photoCountNode.textContent = String(photoCount);
    if (albumCountNode) albumCountNode.textContent = String(albumCount);
    if (publicCountNode) publicCountNode.textContent = String(publicCount);

    setAvatarDisplay($('#profile-avatar-image'), $('#profile-avatar-fallback'), profile.avatarUrl, profile.nickname);
    setAvatarDisplay(
        $('#profile-avatar-upload-preview-image'),
        $('#profile-avatar-upload-preview-fallback'),
        profile.avatarUrl,
        profile.nickname
    );

    const displayNameInput = $('#profile-nickname-input');
    if (displayNameInput) displayNameInput.value = profile.nickname;
    const avatarInput = $('#profile-avatar-input');
    if (avatarInput) avatarInput.value = '';
    const avatarUploadLabel = $('[data-profile-avatar-upload-label]');
    if (avatarUploadLabel) avatarUploadLabel.textContent = profile.avatarUrl ? '사진 변경' : '사진 추가';
}

function setAccountProfileEditMode(isEditing) {
    state.accountProfileEditMode = Boolean(isEditing);
    ensureProfileHeaderShell();
    const view = $('#account-profile-view');
    const form = $('#account-profile-form');
    const editButton = $('#account-profile-edit');
    const logoutButton = $('#account-profile-logout');
    const message = $('#account-profile-message');
    const profileCard = $('.profile-card');
    const avatarInput = $('#profile-avatar-input');

    if (!state.accountProfileEditMode && state.selectedPublicOwnerId === state.currentUser?.id) {
        renderAccountProfilePanel();
    }
    if (view) view.hidden = state.accountProfileEditMode;
    if (form) form.hidden = !state.accountProfileEditMode;
    if (editButton) editButton.hidden = state.accountProfileEditMode || state.selectedPublicOwnerId !== state.currentUser?.id;
    if (logoutButton) logoutButton.hidden = state.selectedPublicOwnerId !== state.currentUser?.id;
    if (message) message.textContent = '';
    if (profileCard) profileCard.classList.toggle('is-editing', state.accountProfileEditMode);
    if (avatarInput) avatarInput.disabled = !state.accountProfileEditMode;
}

function openAccountProfilePage() {
    if (!state.currentUser) {
        openModal('#auth-modal');
        return;
    }
    state.selectedPublicOwnerId = state.currentUser.id;
    state.selectedPublicAlbumId = null;
    setAccountProfileEditMode(false);
    const hash = buildOwnerProfileHash(state.currentUser.id);
    if (window.location.hash !== hash) window.location.hash = hash;
    else renderRoute('profile');
}

function handleAccountProfileAvatarChange(event) {
    const avatarFile = event.target?.files?.[0];
    const message = $('#account-profile-message');
    if (!avatarFile) return;
    const validation = validatePhotoFile(avatarFile);
    if (!validation.accepted) {
        if (event.target) event.target.value = '';
        clearAccountProfileAvatarPreview();
        const profile = getCurrentAccountProfile();
        setAvatarDisplay($('#profile-avatar-image'), $('#profile-avatar-fallback'), profile.avatarUrl, profile.nickname);
        setAvatarDisplay(
            $('#profile-avatar-upload-preview-image'),
            $('#profile-avatar-upload-preview-fallback'),
            profile.avatarUrl,
            profile.nickname
        );
        const avatarUploadLabel = $('[data-profile-avatar-upload-label]');
        if (avatarUploadLabel) avatarUploadLabel.textContent = profile.avatarUrl ? '사진 변경' : '사진 추가';
        if (message) message.textContent = validation.reason || '이미지 파일만 등록할 수 있어요.';
        return;
    }
    const nickname = $('#profile-nickname-input')?.value || getCurrentAccountProfile().nickname;
    clearAccountProfileAvatarPreview();
    const previewUrl = URL.createObjectURL(avatarFile);
    state.accountProfileAvatarPreviewUrl = previewUrl;
    setAvatarDisplay($('#profile-avatar-image'), $('#profile-avatar-fallback'), previewUrl, nickname);
    setAvatarDisplay(
        $('#profile-avatar-upload-preview-image'),
        $('#profile-avatar-upload-preview-fallback'),
        previewUrl,
        nickname
    );
    const avatarUploadLabel = $('[data-profile-avatar-upload-label]');
    if (avatarUploadLabel) avatarUploadLabel.textContent = '사진 변경';
    if (message) message.textContent = '저장하면 프로필 이미지가 반영됩니다.';
}

async function saveAccountProfile(event) {
    event.preventDefault();
    const message = $('#account-profile-message');
    if (!state.currentUser) {
        if (message) message.textContent = '로그인 후 수정할 수 있어요.';
        return;
    }

    let nickname;
    try {
        nickname = normalizeNickname($('#profile-nickname-input')?.value || '');
    } catch {
        if (message) message.textContent = '닉네임을 입력해주세요.';
        return;
    }

    const bioInput = $('#profile-bio-input');
    const bio = bioInput ? String(bioInput.value || '').trim() : getCurrentAccountProfile().bio;
    const avatarFile = $('#profile-avatar-input')?.files?.[0] || null;
    let avatarUrl = getCurrentAccountProfile().avatarUrl;

    if (message) message.textContent = '프로필을 저장하는 중입니다...';
    if (avatarFile) {
        const fileName = `${state.currentUser.id}/profile-${Date.now()}-${safeFileName(avatarFile.name)}`;
        const { url, error: uploadError } = await uploadImage(avatarFile, fileName);
        if (uploadError || !url) {
            if (message) message.textContent = uploadError?.message || '프로필 이미지를 업로드하지 못했어요.';
            return;
        }
        avatarUrl = url;
    }
    const { data: savedProfile, error: profileError } = await updateProfileInDB(state.currentUser.id, {
        nickname,
        bio,
        avatarUrl
    });
    if (profileError) {
        if (message) message.textContent = profileError.message || '공유 프로필을 저장하지 못했어요.';
        return;
    }
    const { user } = await updateUserMetadata({
        nickname,
        bio,
        avatar_url: avatarUrl
    });
    if (user) state.currentUser = user;
    state.profileNames = { ...state.profileNames, [state.currentUser.id]: nickname };
    state.publicProfiles = {
        ...state.publicProfiles,
        [state.currentUser.id]: {
            ...(state.publicProfiles[state.currentUser.id] || {}),
            ...(savedProfile || {}),
            id: state.currentUser.id,
            nickname,
            bio,
            avatar_url: avatarUrl
        }
    };
    updateAccountUI();
    renderAccountProfilePanel();
    setAccountProfileEditMode(false);
    renderSavedPhotoSurfaces();
    renderPublicSurfaces();
    clearAccountProfileAvatarPreview();
    showToast('프로필을 저장했어요.');
}

function updateAccountUI() {
    const profile = getCurrentAccountProfile();
    const button = $('#btn-open-auth');
    const profileButton = $('#btn-open-profile');
    document.body.classList.toggle('is-logged-in', Boolean(state.currentUser));
    document.body.classList.toggle('is-logged-out', !state.currentUser);
    if (profileButton) profileButton.hidden = !state.currentUser;
    const landingEditButton = $('#btn-edit-landing');
    if (landingEditButton) landingEditButton.hidden = !isLandingAdmin(state.currentUser);
    if (!state.currentUser) setAccountMenuOpen(false);
    if (button) {
        button.hidden = Boolean(state.currentUser);
        button.textContent = 'Login';
    }
    setAvatarDisplay($('#account-avatar-image'), $('#account-avatar-fallback'), profile.avatarUrl, profile.nickname);
    renderAccountNotifications();
}

function setAppBooting(isBooting) {
    document.body.classList.toggle('is-app-booting', Boolean(isBooting));
}

function getAccountNotificationItems() {
    return buildAccountNotificationItems({
        currentUserId: state.currentUser?.id || '',
        savedPhotos: state.savedPhotos,
        likedPhotoIds: state.likedPhotoIds,
        isMissingLocationBannerDismissed: state.isMissingLocationBannerDismissed
    });
}

function setAccountNotificationsOpen(isOpen) {
    state.isNotificationPopoverOpen = Boolean(isOpen && state.currentUser);
    const trigger = $('#btn-open-notifications');
    const popover = $('#account-notification-popover');
    if (trigger) trigger.setAttribute('aria-expanded', state.isNotificationPopoverOpen ? 'true' : 'false');
    if (popover) popover.hidden = !state.isNotificationPopoverOpen;
}

function toggleAccountNotifications(event) {
    event?.preventDefault();
    event?.stopPropagation();
    setAccountNotificationsOpen(!state.isNotificationPopoverOpen);
}

function renderAccountNotifications() {
    const trigger = $('#btn-open-notifications');
    const badge = $('#account-notification-badge');
    const popover = $('#account-notification-popover');
    const list = $('#account-notification-list');
    const isLoggedIn = Boolean(state.currentUser);
    const items = getAccountNotificationItems();
    const actionableCount = items.filter((item) => item.route).length;

    if (!isLoggedIn) state.isNotificationPopoverOpen = false;
    if (trigger) {
        trigger.hidden = !isLoggedIn;
        trigger.setAttribute('aria-expanded', state.isNotificationPopoverOpen ? 'true' : 'false');
    }
    if (badge) {
        badge.hidden = !isLoggedIn || actionableCount === 0;
        badge.textContent = '';
        badge.setAttribute('aria-label', `새 알림 ${actionableCount}개`);
    }
    if (popover) popover.hidden = !isLoggedIn || !state.isNotificationPopoverOpen;
    if (!list) return;

    list.innerHTML = items.map((item) => {
        const content = `
            <span class="material-symbols-outlined" aria-hidden="true">${escapeHtml(item.icon)}</span>
            <span class="account-notification-copy">
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.body)}</span>
            </span>
        `;
        if (!item.route) {
            return `<article class="account-notification-item is-empty">${content}</article>`;
        }
        return `<button class="account-notification-item" data-route="${escapeHtml(item.route)}" type="button">${content}</button>`;
    }).join('');
}

async function handleLogout() {
    await signOut();
    resetAccountState();
    closeModals();
    updateAccountUI();
    renderSavedPhotoSurfaces();
    routeTo(APP_SECTIONS.HOME);
    showToast('로그아웃했습니다.');
}

function resetAccountState() {
    state.currentUser = null;
    state.savedPhotos = [];
    state.savedAlbums = [];
    state.likedPhotoIds = [];
    state.hasLoadedSavedPhotos = false;
    state.hasLoadedMyLikes = false;
    state.lastSavedPhotoIds = [];
}

function syncAccountDeletionControl(deleting = false) {
    const input = $('#account-deletion-confirmation');
    const submit = $('#account-deletion-submit');
    const control = getAccountDeletionControlState(input?.value, deleting);
    if (input) input.disabled = deleting;
    if (submit) {
        submit.disabled = control.submitDisabled;
        submit.textContent = deleting ? '삭제 중…' : '계정 영구 삭제';
    }
}

function openAccountDeletionDialog() {
    if (!state.currentUser) {
        openModal('#auth-modal');
        return;
    }
    const input = $('#account-deletion-confirmation');
    const message = $('#account-deletion-message');
    if (input) input.value = '';
    if (message) message.textContent = '';
    syncAccountDeletionControl();
    openModal('#account-deletion-modal');
}

async function handleAccountDeletionSubmit(event) {
    event.preventDefault();
    const input = $('#account-deletion-confirmation');
    const message = $('#account-deletion-message');
    const control = getAccountDeletionControlState(input?.value, false);
    if (!control.confirmed || !state.currentUser) return;

    syncAccountDeletionControl(true);
    if (message) message.textContent = '계정을 삭제하는 중입니다…';
    const { error } = await deleteCurrentAccount();
    if (error) {
        syncAccountDeletionControl(false);
        if (message) message.textContent = '계정을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.';
        return;
    }

    resetAccountState();
    closeModals();
    updateAccountUI();
    renderSavedPhotoSurfaces();
    routeTo(APP_SECTIONS.HOME);
    showToast('계정이 영구적으로 삭제됐습니다.');
}

async function ensureCurrentUserPublicProfile() {
    const user = state.currentUser;
    if (!user?.id) return;
    const { data } = await fetchProfilesByIds([user.id]);
    const profile = (data || []).find((row) => getProfileUserId(row) === user.id);
    let storedProfile = profile || null;

    if (!storedProfile) {
        const providerProfile = getProviderAccountProfile(user);
        const { data: createdProfile, error } = await updateProfileInDB(user.id, providerProfile);
        if (!error) storedProfile = createdProfile;
    }

    const resolvedProfile = resolveAccountProfile(user, storedProfile);
    state.profileNames = { ...state.profileNames, [user.id]: resolvedProfile.nickname };
    state.publicProfiles = {
        ...state.publicProfiles,
        [user.id]: {
            ...(storedProfile || {}),
            id: user.id,
            nickname: resolvedProfile.nickname,
            bio: resolvedProfile.bio,
            avatar_url: resolvedProfile.avatarUrl
        }
    };
}

function showPendingKakaoProfileImport() {
    const provider = takePendingOAuthProvider(window.localStorage);
    if (provider !== 'kakao' || !state.currentUser) return;

    const kakaoProfile = getOAuthIdentityProfile(state.currentUser, 'kakao');
    if (!kakaoProfile || (!kakaoProfile.nickname && !kakaoProfile.avatarUrl)) return;

    state.pendingKakaoProfile = kakaoProfile;
    const previewProfile = mergeOAuthIdentityProfile(getCurrentAccountProfile(), kakaoProfile);
    const name = $('#kakao-profile-import-name');
    const message = $('#kakao-profile-import-message');
    const applyButton = $('#btn-apply-kakao-profile');
    if (name) name.textContent = previewProfile.nickname;
    if (message) message.textContent = '';
    if (applyButton) applyButton.disabled = false;
    setAvatarDisplay(
        $('#kakao-profile-import-avatar-image'),
        $('#kakao-profile-import-avatar-fallback'),
        previewProfile.avatarUrl,
        previewProfile.nickname
    );
    openModal('#kakao-profile-import-modal');
}

function dismissPendingKakaoProfileImport() {
    state.pendingKakaoProfile = null;
    closeModals();
}

async function applyPendingKakaoProfile() {
    const kakaoProfile = state.pendingKakaoProfile;
    const user = state.currentUser;
    if (!kakaoProfile || !user?.id) return;

    const message = $('#kakao-profile-import-message');
    const applyButton = $('#btn-apply-kakao-profile');
    const nextProfile = mergeOAuthIdentityProfile(getCurrentAccountProfile(), kakaoProfile);
    if (applyButton) applyButton.disabled = true;
    if (message) message.textContent = '카카오 프로필을 적용하는 중입니다...';

    const { data: savedProfile, error } = await updateProfileInDB(user.id, nextProfile);
    if (error) {
        if (applyButton) applyButton.disabled = false;
        if (message) message.textContent = '카카오 프로필을 적용하지 못했어요. 다시 시도해주세요.';
        return;
    }

    const { user: updatedUser } = await updateUserMetadata({
        nickname: nextProfile.nickname,
        bio: nextProfile.bio,
        avatar_url: nextProfile.avatarUrl
    });
    if (updatedUser) state.currentUser = updatedUser;
    state.profileNames = { ...state.profileNames, [user.id]: nextProfile.nickname };
    state.publicProfiles = {
        ...state.publicProfiles,
        [user.id]: {
            ...(state.publicProfiles[user.id] || {}),
            ...(savedProfile || {}),
            id: user.id,
            nickname: nextProfile.nickname,
            bio: nextProfile.bio,
            avatar_url: nextProfile.avatarUrl
        }
    };
    state.pendingKakaoProfile = null;
    updateAccountUI();
    renderPublicSurfaces();
    closeModals();
    showToast('카카오 프로필을 적용했습니다.');
}

function normalizeSavedPhoto(photo) {
    const hasLocation = hasUsableCoordinates(photo.lat, photo.lng);
    return {
        id: photo.id,
        description: photo.description || '',
        url: photo.url,
        storage_path: photo.storage_path || null,
        date: photo.date || photo.created_at || new Date().toISOString(),
        created_at: photo.created_at || photo.uploaded_at || photo.createdAt || null,
        lat: hasLocation ? Number(photo.lat) : null,
        lng: hasLocation ? Number(photo.lng) : null,
        shared: !!photo.shared || photo.visibility === 'public',
        owner_id: photo.owner_id,
        liked: Number(photo.liked || 0),
        album_id: photo.album_id || null,
        visibility: photo.visibility || (photo.shared ? 'public' : 'private'),
        location_precision: normalizeLocationPrecision(photo.location_precision),
        album: photo.album || null,
        tags: Array.isArray(photo.ai_tags) ? photo.ai_tags : (Array.isArray(photo.tags) ? photo.tags : []),
        ai_tags: Array.isArray(photo.ai_tags) ? photo.ai_tags : [],
        ai_summary: photo.ai_summary || '',
        ai_scene: photo.ai_scene || 'other',
        ai_moods: Array.isArray(photo.ai_moods) ? photo.ai_moods : [],
        ai_analysis_status: photo.ai_analysis_status || 'pending',
        ai_analyzed_at: photo.ai_analyzed_at || null,
        ai_analysis_model: photo.ai_analysis_model || null
    };
}

let photoAiAnalysisQueue = Promise.resolve();

function queuePhotoAiAnalysis(photos = [], { notifyOnComplete = false } = {}) {
    const candidates = photos.filter((photo) => (
        photo?.id
        && photo.owner_id === state.currentUser?.id
        && photo.ai_analysis_status === 'pending'
    ));
    if (!candidates.length) return;

    photoAiAnalysisQueue = photoAiAnalysisQueue.then(async () => {
        let completedCount = 0;
        for (const photo of candidates) {
            const [result] = await Promise.allSettled([requestPhotoAiAnalysis(photo.id)]);
            if (result.status !== 'fulfilled' || result.value.error || !result.value.data) continue;

            const normalized = normalizeSavedPhoto({ ...photo, ...result.value.data });
            state.savedPhotos = state.savedPhotos.map((savedPhoto) => (
                String(savedPhoto.id) === String(normalized.id) ? normalized : savedPhoto
            ));
            completedCount += 1;
        }
        if (!completedCount) return;
        renderSavedPhotoSurfaces();
        renderPublicSurfaces();
        if (notifyOnComplete) showToast(`AI 사진 분석 ${completedCount}장을 완료했습니다.`);
    }).catch(() => null);
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

function getLikedPhotos() {
    if (!state.currentUser) return [];
    const likedIds = new Set(state.likedPhotoIds.map(String));
    return state.savedPhotos.filter((photo) => likedIds.has(String(photo.id)));
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
        { name: 'Cover', url: MAIN_BG_1_URL },
        { name: 'Route', url: MAIN_BG_2_URL },
        { name: 'Public', url: MAIN_BG_3_URL },
        { name: 'Private', url: MAIN_BG_4_URL }
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

function getSavedPublicAlbums() {
    return state.savedAlbums
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
                cover_url: album.cover_url || photos[0]?.url || getDraftPhotos()[index % getDraftPhotos().length]?.url || MAIN_BG_2_URL,
                photo_count: Number(album.photo_count || photos.length || 1),
                places: locatedPhotos.length,
                lat,
                lng,
                photos
            };
        });
}

function getPublicAlbums() {
    return combinePublicAlbumsWithDemoEntries(getSavedPublicAlbums(), getPublicDemoAlbumEntries());
}

function getSelectedPublicAlbum(albums = getPublicAlbums()) {
    return albums.find((album) => album.id === state.selectedPublicAlbumId) || albums[0];
}

function getSelectedExploreAlbum(albums = getPublicAlbums()) {
    return albums.find((album) => album.id === state.selectedPublicAlbumId) || null;
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

function routeToProfileFromAuthor(albumId, ownerId) {
    const ownerAlbum = albumId
        ? getPublicAlbums().find((album) => album.id === albumId)
        : ownerId
            ? getPublicAlbums().find((album) => album.owner_id === ownerId)
            : null;
    state.selectedPublicOwnerId = ownerId || ownerAlbum?.owner_id || null;
    state.selectedPublicAlbumId = albumId || ownerAlbum?.id || null;
    const hash = buildOwnerProfileHash(state.selectedPublicOwnerId);
    if (window.location.hash !== hash) window.location.hash = hash;
    else renderRoute('profile');
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

async function shareCurrentTripWithKakao() {
    const url = getCurrentShareUrl();
    try {
        const kakao = await loadKakaoShareSdk();
        await sendKakaoShare(kakao, url);
        showToast('카카오톡 공유창을 열었습니다.');
        return url;
    } catch {
        await copyCurrentShareLink();
        return url;
    }
}

function renderEmptyPublicSurfaces() {
    if (document.body.dataset.page === APP_SECTIONS.EXPLORE) setExploreMarkerLoading(false);
    const empty = getPublicAlbumEmptyState();
    const shareOutput = $('#share-link-output');
    if (shareOutput) shareOutput.value = getCurrentShareUrl();

    const preview = $('#explore-pin-preview');
    const previewImage = preview?.querySelector('img');
    const previewStory = preview?.querySelector('.pin-preview-story p');
    const previewMeta = preview?.querySelector('.pin-preview-meta');
    if (previewImage) {
        previewImage.src = MAIN_BG_2_URL;
        previewImage.alt = empty.title;
    }
    if (previewStory) {
        previewStory.textContent = empty.body;
        previewStory.classList.remove('is-empty');
    }
    if (previewMeta) previewMeta.textContent = empty.meta;

    const tripHeroImage = $('.public-trip-hero > img');
    if (tripHeroImage) {
        tripHeroImage.src = MAIN_BG_2_URL;
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
    renderExploreDiscoveryPanel([]);
    $('#public-trip-photo-grid') && ($('#public-trip-photo-grid').innerHTML = emptyCard);
    $('.trip-day-grid') && ($('.trip-day-grid').innerHTML = emptyCard);
    $('.related-album-grid') && ($('.related-album-grid').innerHTML = '');
    $('.profile-photo-grid') && ($('.profile-photo-grid').innerHTML = emptyCard);
    $('.profile-album-grid') && ($('.profile-album-grid').innerHTML = emptyCard);
    $('.route-strip') && ($('.route-strip').innerHTML = '<span>공개 지도</span>');
    $$('.public-author-card h2, #profile-title, .pin-author strong').forEach((node) => {
        node.textContent = 'Ikkyee';
    });
    $$('.public-author-card .avatar, .pin-author .avatar').forEach((avatar) => {
        avatar.textContent = 'IK';
    });
    setAvatarDisplay($('#profile-avatar-image'), $('#profile-avatar-fallback'), '', 'Ikkyee');
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

function renderPublicOwnerProfile(ownerId, publicPhotos = getPublicPhotoMapItems()) {
    ensureProfileHeaderShell();
    const ownerPhotos = getPublicOwnerProfilePhotos(publicPhotos, ownerId);
    const ownerAlbums = getSavedPublicAlbums().filter((album) => album.owner_id === ownerId && ['public', 'link'].includes(album.visibility));
    const authorDetails = getPublicProfileDetails(ownerId);
    const authorName = authorDetails.nickname;
    const authorInitials = getAuthorInitials(authorName);
    const profileBio = authorDetails.bio;
    const avatarUrl = authorDetails.avatarUrl;
    const isOwnProfile = Boolean(ownerId && ownerId === state.currentUser?.id);
    const cover = ownerPhotos[0]?.url || MAIN_BG_4_URL;

    $$('.public-author-card h2, #profile-title, .pin-author strong').forEach((node) => {
        node.textContent = authorName;
    });
    $$('.public-author-card .avatar, .pin-author .avatar').forEach((avatar) => {
        avatar.textContent = authorInitials;
    });
    setAvatarDisplay($('#profile-avatar-image'), $('#profile-avatar-fallback'), avatarUrl, authorName);
    if ($('#profile-bio')) {
        $('#profile-bio').textContent = profileBio;
        $('#profile-bio').hidden = !profileBio;
    }
    if ($('#profile-photo-count')) $('#profile-photo-count').textContent = String(ownerPhotos.length);
    if ($('#profile-album-count')) $('#profile-album-count').textContent = String(ownerAlbums.length);
    if ($('#profile-public-count')) $('#profile-public-count').textContent = String(ownerPhotos.filter((photo) => photo.shared || photo.visibility === 'public').length);
    if ($('#account-profile-edit')) $('#account-profile-edit').hidden = !isOwnProfile || state.accountProfileEditMode;
    if ($('#account-profile-logout')) $('#account-profile-logout').hidden = !isOwnProfile;
    if ($('#account-deletion-section')) $('#account-deletion-section').hidden = !isOwnProfile;
    if (isOwnProfile) renderAccountProfilePanel();
    else setAccountProfileEditMode(false);
    const profileHeroImage = $('.profile-cover > img');
    if (profileHeroImage) {
        profileHeroImage.src = cover;
        profileHeroImage.alt = `${authorName} public profile cover`;
    }
    renderProfileMap(getPublicOwnerProfileMapPhotos(ownerPhotos));
    const profilePhotoGrid = $('.profile-photo-grid');
    if (profilePhotoGrid) {
        profilePhotoGrid.innerHTML = ownerPhotos.length
            ? ownerPhotos.slice(0, 12).map((photo) => {
                const description = getPhotoDescriptionText(photo);
                return `
                <article data-open-photo-detail data-photo-id="${escapeHtml(photo.id)}">
                    ${renderPhotoImage(photo, '공개 사진')}
                    ${description ? `
                    <div class="photo-visible-copy">
                        <strong>${escapeHtml(description)}</strong>
                        <span>${photo.date ? new Date(photo.date).toISOString().slice(0, 10) : '날짜 없음'}</span>
                    </div>
                    ` : ''}
                </article>
            `;
            }).join('')
            : '<article class="empty-state"><strong>공개 사진이 없습니다</strong><span>아직 공개된 사진이 없습니다.</span></article>';
    }
    const profileAlbumGrid = $('.profile-album-grid');
    if (profileAlbumGrid) {
        profileAlbumGrid.innerHTML = ownerAlbums.length
            ? ownerAlbums.slice(0, 12).map((album) => `
                <article class="${getPublicAlbumCardClass(album.id, state.selectedPublicAlbumId)}" data-public-album-id="${escapeHtml(album.id)}" data-go-trip>
                    <img src="${escapeHtml(album.cover_url || MAIN_BG_2_URL)}" alt="" loading="lazy" decoding="async">
                    <strong>${escapeHtml(album.title)}</strong>
                    <span>${formatPhotoPlaceMeta(album.photo_count || 1, album.places || 1)}</span>
                </article>
            `).join('')
            : '<article class="empty-state"><strong>공개 앨범이 없습니다</strong><span>아직 공개한 앨범이 없습니다.</span></article>';
    }
}

function renderTripReviewShell() {
    const page = $('#page-trip');
    if (!page) return;
    page.innerHTML = `
        <div class="trip-review-shell">
            <header class="trip-review-header ${state.albumDetailEditMode ? 'is-editing' : ''}">
                <button class="back-link" data-route="explore" type="button">
                    <span class="material-symbols-outlined">arrow_back</span>
                    <span id="trip-review-back-label">Explore</span>
                </button>
                <div class="trip-review-title-block">
                    <p class="eyebrow">Album Review Map</p>
                    <h1 id="trip-title">Album</h1>
                    <div class="trip-edit-fields">
                        <label for="trip-edit-title">앨범 이름</label>
                        <input id="trip-edit-title" type="text" aria-label="앨범 이름">
                    </div>
                    <p id="trip-review-description">사진이 날짜별로 정리된 앨범 지도입니다.</p>
                    <div id="trip-review-meta" class="trip-review-meta"></div>
                </div>
                <div class="trip-actions">
                    <button id="btn-copy-trip-link" class="album-icon-button" type="button" aria-label="카카오톡으로 공유" data-tooltip="카카오톡으로 공유">
                        <span class="material-symbols-outlined">ios_share</span>
                    </button>
                </div>
            </header>
            <div class="trip-review-layout">
                <main class="trip-review-timeline" aria-labelledby="trip-photo-title">
                    <h2 id="trip-photo-title">날짜별 사진</h2>
                    <div id="public-trip-photo-grid" class="trip-review-photo-flow"></div>
                </main>
                <aside class="trip-review-map-panel" aria-label="앨범 사진 위치 지도">
                    <div id="trip-review-map" class="trip-review-map"></div>
                    <div class="trip-review-map-loading" aria-live="polite">지도 이동 중</div>
                    <div class="trip-review-map-summary" aria-label="앨범 지도 요약">
                        <div id="trip-review-map-meta" class="trip-review-map-meta"></div>
                    </div>
                    <button class="trip-review-map-author" data-go-profile type="button" hidden>
                        <span class="avatar">IK</span>
                        <span>
                            <strong>작성자</strong>
                            <small>공개 프로필 보기</small>
                        </span>
                    </button>
                </aside>
            </div>
        </div>
    `;
}

function renderLandingTagPage() {
    if (!state.hasLoadedLandingCuration) {
        renderLandingTagLoadingPage();
        return;
    }

    const sectionId = state.selectedLandingSectionId || parseLandingTagId(window.location.hash);
    const section = state.landingSections.find((candidate) => String(candidate.id) === String(sectionId));
    if (!canOpenLandingTagPage(section)) {
        routeTo(LANDING_ROUTE, { replace: true });
        return;
    }

    const sectionPhotos = getLandingTagFeedPhotos(section, getLandingPublicPhotos(), getLandingTagSessionSeed(section.id));
    const regions = getLandingTagRegions(sectionPhotos);
    if (state.landingTagRegion && !regions.some((region) => region.label === state.landingTagRegion)) {
        state.landingTagRegion = '';
    }
    const regionPhotos = filterLandingTagPhotosByRegion(sectionPhotos, state.landingTagRegion);
    const photoPage = getLandingTagPhotoPage(regionPhotos, state.landingTagPage);
    state.selectedLandingSectionId = String(section.id);
    state.landingTagPhotos = sectionPhotos;
    state.landingTagPage = photoPage.page;
    state.albumDetailPhotos = photoPage.items;
    state.albumDetailEditMode = false;
    state.tripReviewDateFilter = null;
    state.tripReviewFocusPhotoId = null;
    state.tripReviewMarkers.forEach((marker) => marker.setMap?.(null));
    state.tripReviewMarkers = [];
    state.tripReviewMap = null;
    const page = $('#page-trip');
    if (!page) return;
    page.setAttribute('data-landing-tag-page', String(section.id));
    page.innerHTML = `
        <div class="landing-tag-gallery-shell">
            <header class="landing-tag-gallery-header">
                <button class="back-link" data-route="${LANDING_ROUTE}" type="button">
                    <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
                    <span>홈</span>
                </button>
                <div class="landing-tag-gallery-title-line">
                    <h1>${escapeHtml(section.title)}</h1>
                    <span aria-hidden="true">·</span>
                    <span>${regionPhotos.length}장의 사진</span>
                    <span aria-hidden="true">·</span>
                    <span>${regions.length}개 지역</span>
                </div>
                <nav class="landing-tag-region-filters" aria-label="지역별 사진 필터">
                    ${renderLandingTagRegionButton('', '전체')}
                    ${regions.map((region) => renderLandingTagRegionButton(region.label, region.label)).join('')}
                </nav>
            </header>
            <main class="landing-tag-gallery-content" aria-label="${escapeHtml(section.title)} 사진">
                <div id="public-trip-photo-grid" class="landing-tag-gallery-grid">
                    ${photoPage.items.length
                        ? photoPage.items.map((photo) => renderLandingTagGalleryCard(photo, section.title)).join('')
                        : '<div class="landing-tag-gallery-empty">이 지역에 해당하는 공개 사진이 아직 없습니다.</div>'}
                </div>
                <nav class="landing-tag-pagination" aria-label="태그 사진 페이지" ${photoPage.pageCount <= 1 ? 'hidden' : ''}>
                    <button data-landing-tag-page="previous" type="button" aria-label="이전 사진 페이지" ${photoPage.hasPrevious ? '' : 'disabled'}>
                        <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
                    </button>
                    <span>${photoPage.page} / ${photoPage.pageCount}</span>
                    <button data-landing-tag-page="next" type="button" aria-label="다음 사진 페이지" ${photoPage.hasNext ? '' : 'disabled'}>
                        <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
                    </button>
                </nav>
            </main>
        </div>
    `;
}

function getLandingTagSessionSeed(sectionId) {
    const key = String(sectionId || 'tag');
    if (!state.landingTagRandomSeeds[key]) {
        state.landingTagRandomSeeds[key] = `${Date.now()}-${crypto.randomUUID()}`;
    }
    return state.landingTagRandomSeeds[key];
}

function renderLandingTagRegionButton(value, label) {
    const isActive = state.landingTagRegion === value;
    return `<button class="${isActive ? 'active' : ''}" data-landing-tag-region="${escapeHtml(value)}" type="button" aria-pressed="${isActive ? 'true' : 'false'}">${escapeHtml(label)}</button>`;
}

function renderLandingTagGalleryCard(photo, sectionTitle) {
    const photoId = getTripReviewPhotoId(photo);
    return `
        <button class="landing-tag-gallery-card" data-landing-photo-id="${escapeHtml(photoId)}" type="button" aria-label="${escapeHtml(getPhotoFallbackLabel(photo, sectionTitle))} 상세 보기">
            ${renderPhotoImage(photo, sectionTitle, { fetchPriority: 'low' })}
        </button>
    `;
}

function renderLandingTagLoadingPage() {
    const page = $('#page-trip');
    if (!page) return;
    page.innerHTML = `
        <div class="landing-tag-gallery-shell">
            <header class="landing-tag-gallery-header">
                <button class="back-link" data-route="${LANDING_ROUTE}" type="button"><span class="material-symbols-outlined" aria-hidden="true">arrow_back</span><span>홈</span></button>
                <div class="landing-tag-gallery-title-line"><h1>사진을 불러오는 중입니다</h1></div>
            </header>
            <div class="landing-tag-gallery-empty">공개 사진을 준비하고 있습니다.</div>
        </div>
    `;
}

function renderTripReviewStoryBlock(afterId, text, isEditing) {
    if (!text && !isEditing) return '';
    return `
        <article class="trip-review-story-block ${isEditing ? 'is-editing' : ''}" data-trip-story-after="${escapeHtml(afterId)}">
            ${isEditing ? `
                <textarea class="trip-review-story-text" data-trip-story-text="${escapeHtml(afterId)}" rows="2" aria-label="사진 사이 글귀">${escapeHtml(text)}</textarea>
                <button class="trip-review-story-remove" data-remove-trip-story="${escapeHtml(afterId)}" type="button" aria-label="글귀 삭제">
                    <span class="material-symbols-outlined">close</span>
                </button>
            ` : `<p>${escapeHtml(text)}</p>`}
        </article>
    `;
}

function renderTripReviewStoryInsert(afterId, isEditing, hasStory) {
    if (!isEditing || hasStory) return '';
    return `
        <div class="trip-review-story-insert">
            <button class="trip-review-add-text" data-add-trip-story-after="${escapeHtml(afterId)}" type="button" aria-label="이 사진 뒤에 글귀 추가">
                <span class="material-symbols-outlined">notes</span>
                <span>텍스트 추가</span>
            </button>
        </div>
    `;
}

function renderTripReviewPhotoCard(photo, albumTitle, cover, isEditing) {
    const photoId = getTripReviewPhotoId(photo);
    return `
        <article
            class="trip-review-photo-card ${isEditing ? 'is-editing' : ''}"
            style="--photo-width: ${Math.round(Number(photo.aspectRatio || 1) * 220)}px;"
            data-photo-aspect="${Number(photo.aspectRatio || 1)}"
            ${isEditing ? '' : 'data-open-photo-detail'}
            data-photo-id="${escapeHtml(photoId)}"
        >
            ${isEditing ? `<button class="trip-review-photo-remove" data-remove-trip-photo="${escapeHtml(photoId)}" data-remove-trip-photo-index="${Number(photo._albumReviewIndex ?? -1)}" type="button" aria-label="앨범에서 사진 삭제"><span class="material-symbols-outlined">close</span></button>` : ''}
            <img src="${escapeHtml(photo.url || cover || MAIN_BG_2_URL)}" alt="${escapeHtml(getPhotoFallbackLabel(photo, albumTitle))}" loading="lazy" decoding="async">
        </article>
    `;
}

function renderTripReviewPhotoFlow(albumPhotos, albumTitle, cover, { isEditing = false, storyMap = new Map() } = {}) {
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
                ${section.dateKey ? `<button class="trip-review-date-filter ${state.tripReviewDateFilter === section.dateKey ? 'active' : ''}" data-trip-review-date="${escapeHtml(section.dateKey)}" type="button">${state.tripReviewDateFilter === section.dateKey ? '선택됨' : '지도에서 보기'}</button>` : ''}
            </div>
            <div class="trip-review-day-rows">
                ${section.rows.map((row) => {
                    const photoCards = row.map((photo) => renderTripReviewPhotoCard(photo, albumTitle, cover, isEditing)).join('');
                    const storyControls = row.map((photo) => {
                        const photoId = getTripReviewPhotoId(photo);
                        const storyText = storyMap.get(photoId) || '';
                        const hasStory = storyMap.has(photoId);
                        return `
                            ${renderTripReviewStoryInsert(photoId, isEditing, hasStory)}
                            ${renderTripReviewStoryBlock(photoId, storyText, isEditing && hasStory)}
                        `;
                    }).join('');
                    return `${photoCards}${storyControls}`;
                }).join('')}
            </div>
        </section>
    `).join('');
    requestAnimationFrame(() => {
        layoutTripReviewPhotoRows();
        updateTripReviewDateFilterUI();
    });
}

function getTripReviewCardAspect(card) {
    const image = card.querySelector('img');
    if (image?.naturalWidth && image?.naturalHeight) {
        const ratio = image.naturalWidth / image.naturalHeight;
        if (Number.isFinite(ratio) && ratio > 0) {
            card.dataset.photoAspect = String(Math.round(ratio * 100) / 100);
            return ratio;
        }
    }
    if (image && !card.dataset.aspectLoadBound) {
        card.dataset.aspectLoadBound = 'true';
        image.addEventListener('load', () => layoutTripReviewPhotoRows(), { once: true });
    }
    return Number(card.dataset.photoAspect) || 1;
}

function getTripReviewPhotoDateKey(photo) {
    const raw = photo?.date || photo?.created_at;
    if (!raw) return null;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
}

function getTripReviewMapPhotos(albumPhotos = []) {
    if (!state.tripReviewDateFilter) return albumPhotos;
    return albumPhotos.filter((photo) => getTripReviewPhotoDateKey(photo) === state.tripReviewDateFilter);
}

function getTripReviewPhotoId(photo = {}) {
    return String(photo.id || photo.localId || '');
}

function getTripReviewFocusedPhoto() {
    if (!state.tripReviewFocusPhotoId) return null;
    return state.albumDetailPhotos.find((photo) => getTripReviewPhotoId(photo) === String(state.tripReviewFocusPhotoId)) || null;
}

function updateTripReviewDateFilterUI() {
    $$('[data-trip-review-date]').forEach((button) => {
        const selected = button.dataset.tripReviewDate === state.tripReviewDateFilter;
        button.classList.toggle('active', selected);
        button.textContent = selected ? '선택됨' : '지도에서 보기';
    });
    const meta = $('#trip-review-map-meta');
    if (!meta) return;
    const isLandingTagPage = document.body.dataset.page === 'tag';
    const selectedAlbum = isLandingTagPage ? null : getSelectedPublicAlbum();
    const tripSummary = getTravelSummary({
        draftPhotos: state.albumDetailPhotos,
        selectedAlbum
    });
    const photoCount = state.albumDetailPhotos.length || Number(selectedAlbum?.photo_count || 0);
    const places = isLandingTagPage
        ? state.albumDetailPhotos
            .filter(canShowPhotoOnPublicMap)
            .filter(hasPhotoLocation).length
        : Number(selectedAlbum?.places || Math.max(1, Math.ceil(photoCount / 4)));
    const focusedPhoto = getTripReviewFocusedPhoto();
    const focusedDate = focusedPhoto ? getTripReviewPhotoDateKey(focusedPhoto)?.replaceAll('-', '.') : null;
    meta.innerHTML = isLandingTagPage
        ? `
            <span>${formatPlaceCount(places)}</span>
            <span>${formatPhotoCount(photoCount)} 불러옴</span>
            <span>현재 사진 핀</span>
        `
        : `
            <span>${state.tripReviewDateFilter ? state.tripReviewDateFilter.replaceAll('-', '.') : (tripSummary.dateRange || '날짜 없음')}</span>
            <span>${formatPlaceCount(places)}</span>
            <span>${focusedPhoto ? `선택 사진${focusedDate ? ` · ${focusedDate}` : ''}` : (state.tripReviewDateFilter ? '날짜별 핀' : '전체 핀')}</span>
            ${state.tripReviewDateFilter ? '<button class="trip-review-clear-filter" data-clear-trip-review-date type="button">전체 보기</button>' : ''}
        `;
    $$('.trip-review-photo-card').forEach((card) => {
        card.classList.toggle('is-map-focused', Boolean(state.tripReviewFocusPhotoId && card.dataset.photoId === String(state.tripReviewFocusPhotoId)));
    });
}

function layoutTripReviewPhotoRows() {
    $$('.trip-review-day-rows').forEach((dayRows) => {
        const children = [...dayRows.children];
        const sequence = children.flatMap((child) => {
            if (child.classList.contains('trip-review-photo-row')) {
                return [...child.querySelectorAll('.trip-review-photo-card')];
            }
            return [child];
        });
        const cards = sequence.filter((child) => child.classList?.contains('trip-review-photo-card'));
        if (!cards.length) return;
        const dayWidth = dayRows.clientWidth || dayRows.parentElement?.clientWidth || 0;
        if (!dayWidth) return;
        const styles = window.getComputedStyle(dayRows);
        const gap = Number.parseFloat(styles.columnGap || styles.gap) || 6;
        const nextChildren = [];
        let segment = [];
        const flushSegment = () => {
            if (!segment.length) return;
            const packedRows = packAlbumReviewRowsForWidth(segment.map((card) => ({
                card,
                aspectRatio: getTripReviewCardAspect(card)
            })), dayWidth, { gap, targetHeight: 220 });
            nextChildren.push(...packedRows.map((rowCards) => {
                const row = document.createElement('div');
                row.className = 'trip-review-photo-row';
                row.append(...rowCards.map((item) => item.card));
                return row;
            }));
            segment = [];
        };
        sequence.forEach((child) => {
            if (child.classList?.contains('trip-review-photo-card')) {
                segment.push(child);
                return;
            }
            if (child.classList?.contains('trip-review-story-insert') || child.classList?.contains('trip-review-story-block')) {
                flushSegment();
                nextChildren.push(child);
            }
        });
        flushSegment();
        dayRows.replaceChildren(...nextChildren);
    });

    $$('.trip-review-photo-row').forEach((row) => {
        const cards = [...row.querySelectorAll('.trip-review-photo-card')];
        if (!cards.length) return;
        const rowWidth = row.clientWidth || row.parentElement?.clientWidth || 0;
        if (!rowWidth) return;
        const styles = window.getComputedStyle(row);
        const gap = Number.parseFloat(styles.columnGap || styles.gap) || 6;
        const ratios = cards.map((card) => getTripReviewCardAspect(card));
        const layout = calculateAlbumReviewRowLayout(ratios, rowWidth, { gap, minHeight: 120, maxHeight: 260 });
        row.style.setProperty('--row-height', `${layout.height}px`);
        cards.forEach((card, index) => {
            card.style.setProperty('--photo-width', `${layout.widths[index] || layout.height}px`);
        });
    });
}

function fitTripReviewMapViewport(maps, located, center, focusedLocation) {
    if (!state.tripReviewMap) return;
    if (focusedLocation) {
        state.tripReviewMap.panTo(focusedLocation);
        state.tripReviewMap.setZoom(Math.max(state.tripReviewMap.getZoom() || 14, 14));
    } else if (located.length > 1) {
        const bounds = new maps.LatLngBounds();
        located.forEach((photo) => bounds.extend({ lat: Number(photo.lat), lng: Number(photo.lng) }));
        state.tripReviewMap.fitBounds(bounds, 72);
    } else {
        state.tripReviewMap.panTo(center);
        state.tripReviewMap.setZoom(Math.max(state.tripReviewMap.getZoom() || 13, 13));
    }
}

function refreshTripReviewMapViewport(maps, located, center, focusedLocation) {
    if (!state.tripReviewMap) return;
    maps.event.trigger(state.tripReviewMap, 'resize');
    fitTripReviewMapViewport(maps, located, center, focusedLocation);
}

function setTripReviewMapLoading(isLoading) {
    const tripReviewMapPanel = $('.trip-review-map-panel');
    tripReviewMapPanel?.classList.toggle('is-loading', isLoading);
}

function waitForTripReviewMapContainer(container, renderToken, attempts = 12) {
    return new Promise((resolve) => {
        const check = (remaining) => {
            if (renderToken !== state.tripReviewMapRenderToken || !document.body.contains(container)) {
                resolve(false);
                return;
            }
            const rect = container.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                resolve(true);
                return;
            }
            if (remaining <= 0) {
                resolve(false);
                return;
            }
            requestAnimationFrame(() => check(remaining - 1));
        };
        check(attempts);
    });
}

async function renderTripReviewMap(albumPhotos) {
    const renderToken = ++state.tripReviewMapRenderToken;
    const container = $('#trip-review-map');
    if (!container) return;
    const mapPhotos = document.body.dataset.page === 'tag'
        ? albumPhotos.filter(canShowPhotoOnPublicMap)
        : albumPhotos;
    const located = getTripReviewMapPhotos(mapPhotos).filter(hasPhotoLocation);
    if (!located.length) {
        state.tripReviewMarkers.forEach((marker) => marker.setMap?.(null));
        state.tripReviewMarkers = [];
        state.tripReviewMap = null;
        container.innerHTML = '<div class="map-api-warning"><strong>위치 정보가 있는 사진이 없습니다.</strong><span>위치가 저장된 사진을 추가하면 지도에 표시됩니다.</span></div>';
        setTripReviewMapLoading(false);
        return;
    }

    const isContainerReady = await waitForTripReviewMapContainer(container, renderToken);
    if (renderToken !== state.tripReviewMapRenderToken) return;
    if (!isContainerReady) {
        container.innerHTML = '<div class="map-api-warning"><strong>지도를 표시할 공간을 준비하는 중입니다.</strong><span>잠시 후 날짜를 다시 선택하거나 앨범을 다시 열면 위치가 표시됩니다.</span></div>';
        setTripReviewMapLoading(false);
        return;
    }

    const maps = await loadGoogleMapsApi();
    if (renderToken !== state.tripReviewMapRenderToken) return;
    if (!maps) {
        renderMapUnavailable(container);
        setTripReviewMapLoading(false);
        return;
    }

    const center = { lat: Number(located[0].lat), lng: Number(located[0].lng) };
    if (!state.tripReviewMap) {
        state.tripReviewMap = new maps.Map(container, withGoogleMapsMapId({
            center,
            zoom: located.length > 1 ? 11 : 13,
            disableDefaultUI: true,
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false,
            rotateControl: false,
            scaleControl: false,
            zoomControl: false,
            cameraControl: false,
            panControl: false,
            keyboardShortcuts: false,
            gestureHandling: 'greedy'
        }, state.googleMapsMapId));
    }

    state.tripReviewMarkers.forEach((marker) => marker.setMap(null));
    state.tripReviewMarkers = located.map((photo) => {
        const selected = state.tripReviewFocusPhotoId && getTripReviewPhotoId(photo) === String(state.tripReviewFocusPhotoId);
        const marker = createGoogleMapsMarker(maps, {
            position: { lat: Number(photo.lat), lng: Number(photo.lng) },
            map: state.tripReviewMap,
            title: getPhotoFallbackLabel(photo, '여행 사진'),
            icon: getExplorePinIcon(maps, { type: 'photo', selected }),
            zIndex: selected ? 20 : 10
        }, { mapId: state.googleMapsMapId });
        marker.addListener('click', () => updatePhotoDetailModal(photo, {
            context: document.body.dataset.page === 'tag' ? 'explore' : 'album'
        }));
        return marker;
    });

    const focusedPhoto = getTripReviewFocusedPhoto();
    const focusedLocation = focusedPhoto && hasPhotoLocation(focusedPhoto)
        ? { lat: Number(focusedPhoto.lat), lng: Number(focusedPhoto.lng) }
        : null;
    fitTripReviewMapViewport(maps, located, center, focusedLocation);
    requestAnimationFrame(() => refreshTripReviewMapViewport(maps, located, center, focusedLocation));
    window.setTimeout(() => {
        if (renderToken === state.tripReviewMapRenderToken) setTripReviewMapLoading(false);
    }, 360);

}

function renderPublicSurfaces() {
    if (document.body.dataset.page === 'tag') {
        renderLandingTagPage();
        return;
    }
    ensureProfileHeaderShell();
    const albums = getPublicSurfaceAlbums(document.body.dataset.page, getSavedPublicAlbums(), getPublicDemoAlbumEntries());
    renderExplorePhotoScopeControls();
    if (
        document.body.dataset.page === APP_SECTIONS.EXPLORE
        && !state.hasLoadedSavedPhotos
    ) {
        setExploreMarkerLoading(true);
        return;
    }
    const publicPhotos = getPublicPhotoMapItems();
    const explorePhotos = getExplorePhotoMapItems();
    if (document.body.dataset.page === 'profile' && state.selectedPublicOwnerId) {
        renderPublicOwnerProfile(state.selectedPublicOwnerId, getPublicProfilePhotoItems());
        return;
    }
    const selected = document.body.dataset.page === APP_SECTIONS.EXPLORE
        ? getSelectedExploreAlbum(albums)
        : getSelectedPublicAlbum(albums);
    if (!selected) {
        if (document.body.dataset.page === APP_SECTIONS.EXPLORE && explorePhotos.length) {
            renderExploreMapMarkers(explorePhotos, null);
            const selectedPhoto = explorePhotos.find((photo) => photo.id === state.selectedPhotoId);
            if (selectedPhoto && state.selectedPhotoId) {
                updateExplorePhotoPreview(selectedPhoto);
                document.body.classList.add('explore-pin-selected');
                $('#explore-pin-preview')?.removeAttribute('hidden');
            }
            return;
        }
        renderEmptyPublicSurfaces();
        return;
    }
    state.selectedPublicOwnerId = selected.owner_id || state.selectedPublicOwnerId;
    if (state.albumDetailEditMode && selected.owner_id !== state.currentUser?.id) {
        state.albumDetailEditMode = false;
    }
    state.tripReviewMarkers.forEach((marker) => marker.setMap?.(null));
    state.tripReviewMarkers = [];
    state.tripReviewMap = null;
    renderTripReviewShell();
    const cover = selected.cover_url || MAIN_BG_2_URL;
    const note = getAlbumVisibleNote(selected) || '공개할 사진만 골라 만든 여행 기록입니다.';
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
    const previewStory = preview?.querySelector('.pin-preview-story p');
    const previewMeta = preview?.querySelector('.pin-preview-meta');
    if (previewImage) {
        previewImage.src = cover;
        previewImage.alt = selected.title;
    }
    if (previewStory) {
        previewStory.textContent = note;
        previewStory.classList.toggle('is-empty', !note);
    }
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
    const tripReviewMapMeta = $('#trip-review-map-meta');
    const tripReviewMapAuthor = $('.trip-review-map-author');
    const tripReviewActions = $('.trip-review-header .trip-actions');
    const routeMeta = $('.trip-route-card .compact-heading p');
    if (tripHeroImage) {
        tripHeroImage.src = cover;
        tripHeroImage.alt = selected.title;
    }
    if (tripTitle) tripTitle.textContent = selected.title;
    if (tripCopy) tripCopy.textContent = note;
    if (tripReviewDescription) tripReviewDescription.textContent = note;
    const tripEditTitle = $('#trip-edit-title');
    if (tripEditTitle) tripEditTitle.value = selected.title || '';
    const reviewBackButton = $('.trip-review-header .back-link');
    const reviewBackLabel = $('#trip-review-back-label');
    if (reviewBackButton) reviewBackButton.dataset.route = isOwnAlbum ? 'home' : 'explore';
    if (reviewBackLabel) reviewBackLabel.textContent = isOwnAlbum ? 'Home' : 'Explore';
    if (tripReviewMeta) {
        tripReviewMeta.innerHTML = `
            <span>${tripSummary.dateRange || '날짜 없음'}</span>
            <span>${formatPlaceCount(places)}</span>
            <span>${formatPhotoCount(photoCount || tripPhotos.length)}</span>
        `;
    }
    if (tripReviewMapMeta) updateTripReviewDateFilterUI();
    if (tripReviewMapAuthor) {
        const authorAvatar = tripReviewMapAuthor.querySelector('.avatar');
        const authorNameNode = tripReviewMapAuthor.querySelector('strong');
        tripReviewMapAuthor.hidden = !selected.owner_id;
        tripReviewMapAuthor.dataset.publicAlbumId = selected.id || '';
        tripReviewMapAuthor.dataset.publicOwnerId = selected.owner_id || '';
        if (authorAvatar) authorAvatar.textContent = authorInitials;
        if (authorNameNode) authorNameNode.textContent = authorName;
    }
    if (tripReviewActions) {
        tripReviewActions.innerHTML = `
            ${isOwnAlbum && !state.albumDetailEditMode ? `
                <button id="btn-add-trip-photos" class="album-icon-button" type="button" aria-label="사진 추가" data-tooltip="사진 추가">
                    <span class="material-symbols-outlined">add_photo_alternate</span>
                </button>
            ` : ''}
            ${!state.albumDetailEditMode ? `
                <button id="btn-copy-trip-link" class="album-icon-button" type="button" aria-label="카카오톡으로 공유" data-tooltip="카카오톡으로 공유">
                    <span class="material-symbols-outlined">ios_share</span>
                </button>
            ` : ''}
            ${isOwnAlbum && state.albumDetailEditMode ? `
                <button id="btn-edit-album" class="album-icon-button is-active" type="button" aria-label="수정 완료" data-tooltip="수정 완료">
                    <span class="material-symbols-outlined">done</span>
                </button>
                <button id="btn-add-trip-photos" class="album-icon-button" type="button" aria-label="사진 추가" data-tooltip="사진 추가">
                    <span class="material-symbols-outlined">add_photo_alternate</span>
                </button>
                <button id="btn-toggle-album-visibility" class="album-icon-button" type="button" aria-label="${selected.visibility === 'public' ? '비공개로 전환' : '공개로 전환'}" data-tooltip="${selected.visibility === 'public' ? '비공개로 전환' : '공개로 전환'}">
                    <span class="material-symbols-outlined">${selected.visibility === 'public' ? 'lock' : 'public'}</span>
                </button>
            ` : ''}
            ${isOwnAlbum && !state.albumDetailEditMode ? `
                <details class="album-more-menu">
                    <summary class="album-icon-button" aria-label="앨범 메뉴" data-tooltip="더보기">
                        <span class="material-symbols-outlined">more_vert</span>
                    </summary>
                    <div class="album-more-menu-list">
                        <button data-album-action="edit" type="button">
                            <span class="material-symbols-outlined">${state.albumDetailEditMode ? 'done' : 'edit'}</span>
                            ${state.albumDetailEditMode ? '수정 완료' : '수정하기'}
                        </button>
                        <button data-album-action="cover" type="button">
                            <span class="material-symbols-outlined">image</span>
                            대표사진 설정
                        </button>
                        <button data-album-action="delete" class="danger" type="button">
                            <span class="material-symbols-outlined">delete</span>
                            앨범 삭제
                        </button>
                    </div>
                </details>
            ` : ''}
        `;
    }
    if (tripActions) {
        const isOwnAlbum = selected.owner_id && selected.owner_id === state.currentUser?.id;
        tripActions.innerHTML = `
            ${isOwnAlbum ? '<button id="btn-edit-album" class="btn-secondary" type="button">수정하기</button>' : ''}
        `;
    }
    if (routeMeta) routeMeta.textContent = getPublicTripRouteMeta(tripSummary);

    $$('.public-author-card .avatar, .pin-author .avatar').forEach((avatar) => {
        avatar.textContent = authorInitials;
    });
    $$('.public-author-card h2, #profile-title, .pin-author strong').forEach((nameNode) => {
        nameNode.textContent = authorName;
    });

    const routeStrip = $('.route-strip');
    if (routeStrip) {
        const routeLabels = selected.photos?.filter(hasPhotoLocation).slice(0, 4).map((photo) => getPhotoFallbackLabel(photo))
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
            isEditing: isOwnAlbum && state.albumDetailEditMode,
            storyMap: getAlbumStoryMap(selected)
        });
    }

    const locatedPhotos = explorePhotos;
    renderTripReviewMap(tripPhotos);
    if (document.body.dataset.page === APP_SECTIONS.EXPLORE) {
        renderExploreMapMarkers(locatedPhotos, selected.id);
    }
    const selectedPhoto = locatedPhotos.find((photo) => photo.album_id === selected.id) || locatedPhotos[0];
    if (selectedPhoto) updateExplorePhotoPreview(selectedPhoto);

    const relatedGrid = $('.related-album-grid');
    if (relatedGrid) {
        relatedGrid.innerHTML = getRelatedAlbums(albums, selected).map((album) => `
            <article class="${getPublicAlbumCardClass(album.id, selected.id)}" data-public-album-id="${escapeHtml(album.id)}" data-go-trip>
                <img src="${escapeHtml(album.cover_url || MAIN_BG_2_URL)}" alt="" loading="lazy" decoding="async">
                <strong>${escapeHtml(album.title)}</strong>
                <span>${formatPhotoPlaceMeta(album.photo_count || 1, album.places || 1)}</span>
            </article>
        `).join('');
    }

    const profileAlbums = getProfileAlbums(albums, selected);

    const profilePhotos = publicPhotos.filter((photo) => photo.owner_id === selected.owner_id || photo.albumOwnerId === selected.owner_id);
    renderProfileMap(profilePhotos);
    const profilePhotoGrid = $('.profile-photo-grid');
    if (profilePhotoGrid) {
        profilePhotoGrid.innerHTML = profilePhotos.length
            ? profilePhotos.slice(0, 12).map((photo) => {
                const description = getPhotoDescriptionText(photo);
                return `
                <article data-open-photo-detail data-photo-id="${escapeHtml(photo.id)}">
                    ${renderPhotoImage(photo, '공개 사진')}
                    ${description ? `
                    <div class="photo-visible-copy">
                        <strong>${escapeHtml(description)}</strong>
                        <span>${photo.date ? new Date(photo.date).toISOString().slice(0, 10) : '날짜 없음'}</span>
                    </div>
                    ` : ''}
                </article>
            `;
            }).join('')
            : '<article class="empty-state"><strong>공개 사진이 없습니다</strong><span>아직 공개한 사진이 없습니다.</span></article>';
    }

    const profileAlbumGrid = $('.profile-album-grid');
    if (profileAlbumGrid) {
        profileAlbumGrid.innerHTML = profileAlbums.slice(0, 6).map((album) => `
            <article class="${getPublicAlbumCardClass(album.id, selected.id)}" data-public-album-id="${escapeHtml(album.id)}" data-go-trip>
                <img src="${escapeHtml(album.cover_url || MAIN_BG_2_URL)}" alt="" loading="lazy" decoding="async">
                <strong>${escapeHtml(album.title)}</strong>
                <span>${formatPhotoPlaceMeta(album.photo_count || 1, album.places || 1)}</span>
            </article>
        `).join('');
    }

    const profileHeroImage = $('.profile-cover > img');
    if (profileHeroImage) {
        profileHeroImage.src = getProfileHeroImage(selected, profileAlbums, MAIN_BG_4_URL);
        profileHeroImage.alt = `${authorName} public profile cover`;
    }

    $$('[data-public-album-id]').forEach((item) => {
        item.addEventListener('click', () => {
            setSelectedPublicAlbum(item.dataset.publicAlbumId);
            if (item.hasAttribute('data-go-trip')) routeToTrip(item.dataset.publicAlbumId);
            if (shouldOpenExplorePreview({
                isTripLink: item.hasAttribute('data-go-trip'),
                isExploreListItem: item.classList.contains('explore-item')
            })) {
                setExplorePreviewExpanded(false);
                document.body.classList.add('explore-pin-selected');
                $('#explore-pin-preview')?.removeAttribute('hidden');
            }
        });
    });
    $$('#public-trip-photo-grid [data-open-photo-detail], .profile-photo-grid [data-open-photo-detail], .profile-album-grid [data-open-photo-detail]').forEach((item) => {
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

async function loadSavedPhotos({ render = true } = {}) {
    const { data, error } = await fetchPhotos({ hydrateUrls: false });
    if (error) {
        state.savedPhotos = [];
        state.hasLoadedSavedPhotos = true;
        state.savedPhotosLoadError = true;
        showToast('저장된 사진을 불러오지 못했습니다.');
        if (render) renderSavedPhotoSurfaces();
        if (render || document.body.dataset.page === APP_SECTIONS.EXPLORE) renderPublicSurfaces();
        return;
    }
    state.savedPhotosLoadError = false;
    const metadataPhotos = (data || [])
        .filter((photo) => !state.currentUser || photo.owner_id === state.currentUser.id || photo.shared || photo.visibility === 'public')
        .map(normalizeSavedPhoto);
    state.savedPhotos = metadataPhotos;
    state.hasLoadedSavedPhotos = true;

    if (document.body.dataset.page === APP_SECTIONS.EXPLORE) renderPublicSurfaces();

    const { data: hydratedPhotos } = await hydratePhotoUrls(metadataPhotos);
    const hydratedById = new Map((hydratedPhotos || []).map((photo) => [String(photo.id), photo]));
    state.savedPhotos = state.savedPhotos.map((photo) => {
        const hydrated = hydratedById.get(String(photo.id));
        return hydrated?.url ? { ...photo, url: hydrated.url } : photo;
    });
    if (render) {
        renderSavedPhotoSurfaces();
        renderPublicSurfaces();
    }
    queuePhotoAiAnalysis(state.savedPhotos.filter((photo) => (
        photo.owner_id === state.currentUser?.id
        && photo.ai_analysis_status === 'pending'
    )), { notifyOnComplete: true });
}

async function loadMyLikedPhotos({ render = true } = {}) {
    if (!state.currentUser) {
        state.likedPhotoIds = [];
        state.hasLoadedMyLikes = true;
        if (render) renderLikedPhotoSurfaces();
        return;
    }
    const { data, error } = await fetchMyLikes(state.currentUser.id);
    if (error) {
        state.likedPhotoIds = [];
        state.hasLoadedMyLikes = true;
        state.myLikesLoadError = true;
        showToast('좋아요한 사진을 불러오지 못했습니다.');
        if (render) renderLikedPhotoSurfaces();
        return;
    }
    state.myLikesLoadError = false;
    state.likedPhotoIds = (data || []).map(String);
    state.hasLoadedMyLikes = true;
    if (render) renderLikedPhotoSurfaces();
}

async function loadSavedAlbums({ render = true } = {}) {
    const { data, error } = await fetchAlbums();
    if (error) {
        state.savedAlbums = [];
        state.hasLoadedSavedAlbums = true;
        state.savedAlbumsLoadError = true;
        if (render) {
            renderSavedPhotoSurfaces();
            renderPublicSurfaces();
        }
        return;
    }
    state.hasLoadedSavedAlbums = true;
    state.savedAlbumsLoadError = false;
    state.savedAlbums = (data || [])
        .filter((album) => !state.currentUser || album.owner_id === state.currentUser.id || ['public', 'link'].includes(album.visibility))
        .map(normalizeSavedAlbum);
    if (render) {
        renderSavedPhotoSurfaces();
        renderPublicSurfaces();
    }
}

function loadSavedLibrary() {
    state.isSavedLibraryLoading = true;
    return Promise.all([
        loadSavedPhotos({ render: false }),
        loadMyLikedPhotos({ render: false }),
        loadSavedAlbums({ render: false })
    ]).then(() => {
        state.isSavedLibraryLoading = false;
        state.savedAlbums = applyPhotoUrlsToAlbumCovers(state.savedAlbums, state.savedPhotos);
        renderSavedPhotoSurfaces();
        renderPublicSurfaces();
        renderLikedPhotoSurfaces();
    });
}

async function retrySavedLibrary() {
    state.isSavedLibraryLoading = true;
    state.hasLoadedSavedPhotos = false;
    state.hasLoadedMyLikes = false;
    state.hasLoadedSavedAlbums = false;
    state.savedPhotosLoadError = false;
    state.savedAlbumsLoadError = false;
    state.myLikesLoadError = false;
    renderSavedPhotoSurfaces();
    renderLikedPhotoSurfaces();
    await loadSavedLibrary();
}

async function loadPublicProfileNames() {
    const albumOwnerIds = state.savedAlbums.map((album) => album.owner_id);
    const publicPhotoOwnerIds = state.savedPhotos
        .filter((photo) => photo.shared || ['public', 'link'].includes(photo.visibility))
        .map((photo) => photo.owner_id);
    const ownerIds = [...new Set([...albumOwnerIds, ...publicPhotoOwnerIds].filter((id) => id && id !== 'demo'))];
    if (!ownerIds.length) return;
    const { data, error } = await fetchProfilesByIds(ownerIds);
    if (error) return;
    state.profileNames = (data || []).reduce((names, profile) => {
        const userId = getProfileUserId(profile);
        const displayName = getProfileDisplayName(profile);
        if (userId && displayName) names[userId] = displayName;
        return names;
    }, { ...state.profileNames });
    state.publicProfiles = (data || []).reduce((profiles, profile) => {
        const userId = getProfileUserId(profile);
        if (userId) profiles[userId] = profile;
        return profiles;
    }, { ...state.publicProfiles });
    renderPublicSurfaces();
}

function renderSavedPhotoSurfaces() {
    const myPhotos = getMySavedPhotos();
    const isSavedPhotoLoading = Boolean(state.currentUser && !state.hasLoadedSavedPhotos);
    const missingLocationPhotos = getMissingLocationPhotos(myPhotos);
    const savedAlbums = state.currentUser
        ? state.savedAlbums.filter((album) => album.owner_id === state.currentUser.id)
        : [];
    const stats = getMyphotoStats(myPhotos, savedAlbums);
    const recentGrid = $('#recent-photo-grid');
    const albumList = $('#album-list');

    $('#stat-photo-count') && ($('#stat-photo-count').textContent = String(stats.photoCount));
    $('#stat-located-count') && ($('#stat-located-count').textContent = String(stats.locatedCount));
    $('#stat-missing-count') && ($('#stat-missing-count').textContent = String(stats.missingLocationCount));
    $('#stat-album-count') && ($('#stat-album-count').textContent = String(stats.albumCount));
    const attentionBanner = $('.attention-banner');
    if (stats.missingLocationCount === 0) state.isMissingLocationBannerDismissed = false;
    const shouldShowMissingLocationBanner = stats.missingLocationCount > 0 && !state.isMissingLocationBannerDismissed;
    if (attentionBanner) attentionBanner.hidden = !shouldShowMissingLocationBanner;
    const attentionTitle = $('.attention-banner strong');
    if (shouldShowMissingLocationBanner) {
        if (attentionTitle) attentionTitle.textContent = formatMissingLocationSummary(stats.missingLocationCount);
    }
    renderMissingLocationTasks(missingLocationPhotos);
    renderPersonalPhotosPage(myPhotos);
    renderLikedPhotoSurfaces();

    if (recentGrid) {
        recentGrid.innerHTML = state.savedPhotosLoadError
            ? renderActionableFailure(getLibraryFailureState('photos', { online: navigator.onLine }))
            : isSavedPhotoLoading
            ? `
            <article class="empty-state album-empty-state recent-photo-empty recent-photo-loading">
                <div>
                    <strong>사진을 불러오는 중입니다.</strong>
                    <span>저장한 사진을 확인하고 있어요.</span>
                </div>
            </article>
        `
            : myPhotos.length
            ? myPhotos.slice(0, 8).map((photo) => `
            <article data-open-photo-detail data-photo-id="${escapeHtml(photo.id)}">
                ${renderPhotoImage(photo)}
            </article>
        `).join('')
            : `
            <article class="empty-state album-empty-state recent-photo-empty">
                <div>
                    <strong>아직 저장한 사진이 없습니다.</strong>
                    <span>사진 업로드를 한 번 해보세요.</span>
                </div>
                <button class="btn-secondary" data-route="upload" type="button">사진 업로드</button>
            </article>
        `;
        revealPhotoThumbnailGridWhenReady(recentGrid);
    }

    if (state.savedAlbumsLoadError && albumList) {
        albumList.innerHTML = renderActionableFailure(getLibraryFailureState('albums', { online: navigator.onLine }));
    } else if (state.currentUser && !state.hasLoadedSavedAlbums && albumList) {
        albumList.innerHTML = `
            <article class="empty-state album-empty-state recent-photo-loading" role="status">
                <div>
                    <strong>앨범을 불러오는 중입니다.</strong>
                    <span>저장한 여행을 확인하고 있어요.</span>
                </div>
            </article>
        `;
    } else if (state.albumDrafts.length) {
        renderAlbumDrafts();
    } else if (savedAlbums.length) {
        renderSavedAlbumRows(savedAlbums);
    } else {
        renderAlbumDrafts();
    }
    syncPhotosAlbumList();
}

function renderLikedPhotoSurfaces() {
    const likedPhotos = getLikedPhotos();
    const isLikedPhotoLoading = Boolean(state.currentUser && (!state.hasLoadedSavedPhotos || !state.hasLoadedMyLikes));
    const compactGrid = $('#liked-photo-grid');
    const fullGrid = $('#liked-photo-full-grid');
    const pagination = $('#liked-photo-pagination');
    const summary = $('#liked-photo-summary');
    if (summary) summary.textContent = formatPhotoCount(likedPhotos.length);

    const emptyMarkup = `
        <article class="empty-state album-empty-state recent-photo-empty">
            <div>
                <strong>아직 좋아요한 사진이 없습니다.</strong>
                <span>Explore에서 마음에 드는 사진을 눌러 모아보세요.</span>
            </div>
            <button class="btn-secondary" data-route="explore" type="button">Explore 열기</button>
        </article>
    `;
    const failureMarkup = renderActionableFailure(
        getLibraryFailureState('likes', { online: navigator.onLine })
    );

    if (compactGrid) {
        compactGrid.innerHTML = state.myLikesLoadError
            ? failureMarkup
            : isLikedPhotoLoading
            ? `
            <article class="empty-state album-empty-state recent-photo-empty recent-photo-loading">
                <div>
                    <strong>좋아요한 사진을 불러오는 중입니다.</strong>
                    <span>내가 표시한 사진을 확인하고 있어요.</span>
                </div>
            </article>
        `
            : likedPhotos.length
            ? likedPhotos.slice(0, 8).map((photo) => `
            <article data-open-photo-detail data-photo-id="${escapeHtml(photo.id)}">
                ${renderPhotoImage(photo)}
            </article>
        `).join('')
            : emptyMarkup;
        revealPhotoThumbnailGridWhenReady(compactGrid);
    }

    if (!fullGrid) {
        renderAccountNotifications();
        return;
    }
    if (state.myLikesLoadError) {
        fullGrid.innerHTML = failureMarkup;
        if (pagination) pagination.hidden = true;
        renderAccountNotifications();
        return;
    }
    if (!likedPhotos.length) {
        fullGrid.innerHTML = `
            <article class="empty-state">
                <strong>아직 좋아요한 사진이 없습니다</strong>
                <span>Explore에서 공개 사진을 둘러보고 좋아요를 눌러보세요.</span>
                <button class="btn-secondary" data-route="explore" type="button">Explore 열기</button>
            </article>
        `;
        if (pagination) pagination.hidden = true;
        renderAccountNotifications();
        return;
    }

    const likedPage = getPhotoPage(likedPhotos, state.likedPhotoPage);
    state.likedPhotoPage = likedPage.currentPage;
    fullGrid.innerHTML = likedPage.items.map((photo) => `
            <article class="personal-photo-card liked-photo-card" data-open-photo-detail data-photo-id="${escapeHtml(photo.id)}">
                ${renderPhotoImage(photo)}
            </article>
        `).join('');
    revealPhotoThumbnailGridWhenReady(fullGrid);
    renderPhotoPagination(pagination, likedPage, 'liked');
    renderAccountNotifications();
}

function renderPhotoPagination(container, page, pageKey) {
    if (!container) return;
    container.hidden = !page.shouldPaginate;
    if (!page.shouldPaginate) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <button type="button" data-photo-page="${pageKey}" data-page-direction="previous" aria-label="이전 사진 페이지" ${page.hasPrevious ? '' : 'disabled'}>
            <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
        </button>
        <span aria-current="page">${page.currentPage} / ${page.totalPages}</span>
        <button type="button" data-photo-page="${pageKey}" data-page-direction="next" aria-label="다음 사진 페이지" ${page.hasNext ? '' : 'disabled'}>
            <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
        </button>
    `;
}

function renderPersonalPhotosPage(photos = getMySavedPhotos()) {
    const grid = $('#personal-photo-grid');
    const summary = $('#personal-photo-summary');
    const deleteButton = $('#btn-delete-selected-photos');
    const pagination = $('#personal-photo-pagination');
    state.selectedPersonalPhotoIds = prunePersonalPhotoSelection(state.selectedPersonalPhotoIds, photos);
    const selectedCount = state.selectedPersonalPhotoIds.length;
    if (summary) summary.textContent = formatPhotoCount(photos.length);
    if (deleteButton) {
        deleteButton.hidden = selectedCount === 0;
        deleteButton.disabled = selectedCount === 0;
        deleteButton.textContent = selectedCount ? `선택 ${selectedCount}장 삭제` : '선택 삭제';
    }

    if (state.savedPhotosLoadError) {
        grid.innerHTML = renderActionableFailure(
            getLibraryFailureState('photos', { online: navigator.onLine })
        );
        if (pagination) pagination.hidden = true;
        return;
    }

    if (!photos.length) {
        grid.innerHTML = `
            <article class="empty-state">
                <strong>아직 올린 개별사진이 없습니다</strong>
                <span>마이포토에서 사진 올리기를 누르면 이곳에 개인 사진이 쌓입니다.</span>
            </article>
        `;
        if (pagination) pagination.hidden = true;
        return;
    }

    const personalPage = getPhotoPage(photos, state.personalPhotoPage);
    state.personalPhotoPage = personalPage.currentPage;
    grid.innerHTML = personalPage.items.map((photo) => {
        const isSelected = state.selectedPersonalPhotoIds.includes(photo.id);
        const shouldAnimateSelection = isSelected && state.lastToggledPersonalPhotoId === photo.id;
        return `
            <article class="personal-photo-card ${isSelected ? 'is-selected' : ''} ${shouldAnimateSelection ? 'is-selection-animated' : ''}" data-open-photo-detail data-photo-id="${escapeHtml(photo.id)}">
                <button class="photo-select-button" data-toggle-personal-photo="${escapeHtml(photo.id)}" type="button" aria-pressed="${isSelected}" aria-label="사진 선택"></button>
                ${renderPhotoImage(photo)}
            </article>
        `;
    }).join('');
    revealPhotoThumbnailGridWhenReady(grid);
    renderPhotoPagination(pagination, personalPage, 'personal');
    state.lastToggledPersonalPhotoId = null;
}

async function deleteSelectedPersonalPhotos() {
    const myPhotos = getMySavedPhotos();
    const selectedPhotos = getSelectedPersonalPhotos(myPhotos, state.selectedPersonalPhotoIds);
    if (!selectedPhotos.length) return;
    const confirmed = window.confirm(`선택한 사진 ${selectedPhotos.length}장을 정말 삭제할까요? 삭제한 사진은 복구할 수 없습니다.`);
    if (!confirmed) return;

    const deleteButton = $('#btn-delete-selected-photos');
    if (deleteButton) deleteButton.disabled = true;

    try {
        for (const photo of selectedPhotos) {
            const { error } = await deletePhoto(photo.id, photo.url, photo.storage_path);
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
        list.innerHTML = '';
        return;
    }

    list.innerHTML = photos.slice(0, 4).map((photo) => `
        <button class="missing-location-thumb" type="button" data-open-photo-editor data-photo-id="${escapeHtml(photo.id)}" aria-label="위치 직접 지정">
            <img src="${escapeHtml(photo.url)}" alt="" loading="lazy" decoding="async">
        </button>
    `).join('');
}

function getUniqueAlbumCoverSources(sources, limit = 3) {
    const uniqueSources = [];
    for (const source of sources) {
        if (!source || uniqueSources.includes(source)) continue;
        uniqueSources.push(source);
        if (uniqueSources.length >= limit) break;
    }
    return uniqueSources;
}

function getAlbumCoverLayerMarkup(source, layerClass) {
    const blankClass = source ? '' : ' album-cover-layer--blank';
    const imageMarkup = source ? `<img src="${escapeHtml(source)}" alt="" loading="lazy" decoding="async">` : '';

    return `
            <span class="album-cover-layer ${layerClass}${blankClass}" aria-hidden="true">
                ${imageMarkup}
            </span>`;
}

function getAlbumCoverStackMarkup(sources, altText) {
    const visibleSources = getUniqueAlbumCoverSources(sources);
    const layerSources = [
        visibleSources[2] || '',
        visibleSources[1] || '',
        visibleSources[0] || ''
    ];

    return `
        <div class="album-cover-stack" aria-label="${escapeHtml(altText)} 대표 사진">
${getAlbumCoverLayerMarkup(layerSources[0], 'album-cover-layer--back')}
${getAlbumCoverLayerMarkup(layerSources[1], 'album-cover-layer--middle')}
${getAlbumCoverLayerMarkup(layerSources[2], 'album-cover-layer--front')}
        </div>
    `;
}

function renderSavedAlbumRows(albums) {
    const list = $('#album-list');
    const summary = $('#myphoto-summary');
    if (!list) return;
    if (summary) summary.textContent = '';
    const myPhotos = getMySavedPhotos();
    list.innerHTML = albums.map((album) => {
        const albumPhotos = myPhotos.filter((photo) => photo.album_id === album.id);
        const coverMarkup = getAlbumCoverStackMarkup([album.cover_url, ...albumPhotos.map((photo) => photo.url)], album.title);
        return `
            <article class="album-row" role="button" tabindex="0" data-myphoto-album-id="${escapeHtml(album.id)}" data-myphoto-album-visibility="${escapeHtml(album.visibility)}">
                ${coverMarkup}
                <div class="album-row-content">
                    <strong>${escapeHtml(album.title)}</strong>
                    <p>${escapeHtml(getAlbumVisibleNote(album) || '저장된 여행 앨범입니다.')}</p>
                    <small><span class="album-count-icon" aria-hidden="true"></span>${formatPhotoCount(album.photo_count)}</small>
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
    if (summary) summary.textContent = '';
    list.innerHTML = albums.map(([name, albumPhotos]) => {
        const shared = albumPhotos.some((photo) => photo.shared);
        const coverMarkup = getAlbumCoverStackMarkup(albumPhotos.map((photo) => photo.url), name);
        return `
            <article class="album-row" role="button" tabindex="0" data-myphoto-album-name="${escapeHtml(name)}" data-myphoto-album-visibility="${shared ? 'public' : 'private'}">
                ${coverMarkup}
                <div class="album-row-content">
                    <strong>${escapeHtml(name)}</strong>
                    <p>저장된 사진을 기준으로 구성한 여행 앨범입니다.</p>
                    <small><span class="album-count-icon" aria-hidden="true"></span>${formatPhotoCount(albumPhotos.length)}</small>
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
    const uploadLimitStatus = getAccountUploadLimitStatus({
        user: state.currentUser,
        photos: state.savedPhotos,
        incomingUploadCount: selectedUploadCount
    });
    const isUploadLimitBlocked = state.currentUser && !uploadLimitStatus.canUpload;
    const uploadStorageStatus = $('#upload-storage-status');
    $('#album-count-label') && ($('#album-count-label').textContent = formatPhotoCount(state.stagedPhotos.length));
    $('#myphoto-summary') && ($('#myphoto-summary').textContent = '');
    $('#upload-total-count') && ($('#upload-total-count').textContent = `${selectedUploadCount}장`);
    $('#upload-result-panel')?.classList.toggle('is-visible', state.stagedPhotos.length > 0);
    if (reviewButton) reviewButton.textContent = '업로드하기';
    if (reviewButton) reviewButton.disabled = !selectedUploadCount || isUploadLimitBlocked;
    if (uploadStorageStatus) {
        uploadStorageStatus.textContent = isUploadLimitBlocked
            ? getAccountUploadLimitMessage(uploadLimitStatus)
            : `남은 업로드 가능 수 ${uploadLimitStatus.remainingUploads}장 · 모든 사진은 기본 비공개로 저장됩니다.`;
    }
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
                        <img src="${escapeHtml(photo.url)}" alt="선택한 사진" draggable="false" decoding="async">
                    </button>
                `).join('')}
            </div>
        `;
        bindPhotoInput();
    }
    if (grid) grid.innerHTML = state.stagedPhotos.map((photo) => `
        <article class="photo-card">
            <img src="${escapeHtml(photo.url)}" alt="선택한 사진" decoding="async">
            <span>선택한 사진</span>
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
            Home
        </button>
        <div class="album-compose-header">
            <div>
                <p class="eyebrow">Album Builder</p>
                <h1 id="album-title">${editingAlbum ? '앨범 수정하기' : '앨범 만들기'}</h1>
            </div>
            <button id="btn-save-album-draft" class="btn-primary" type="button">저장하기</button>
        </div>
        <section class="album-compose-bar" aria-label="앨범 기본 정보">
            <label class="album-compose-field" for="album-name-input">
                <span>앨범 이름</span>
                <input id="album-name-input" type="text" placeholder="예: 부산 주말 여행" value="${escapeHtml(editingAlbum?.title || '')}">
            </label>
            <label class="album-compose-field" for="album-note-input">
                <span>설명</span>
                <textarea id="album-note-input" rows="2" placeholder="이 앨범에 남길 설명을 적어주세요.">${escapeHtml(getAlbumVisibleNote(editingAlbum))}</textarea>
            </label>
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
    const getTime = (photo) => {
        const date = photo?.date ? new Date(photo.date) : null;
        return date && !Number.isNaN(date.getTime()) ? date.getTime() : Number.POSITIVE_INFINITY;
    };
    const formatMonthDay = (dateKey) => {
        if (dateKey === '날짜 없음') return '날짜 없음';
        const [, month, day] = dateKey.split('-').map(Number);
        return `${month}월 ${day}일`;
    };
    photos.slice().sort((a, b) => getTime(a) - getTime(b)).forEach((photo) => {
        const date = photo.date ? new Date(photo.date) : null;
        const key = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '날짜 없음';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(photo);
    });
    return [...groups.entries()].map(([date, items]) => ({
        date,
        title: formatMonthDay(date),
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
                                ${renderPhotoImage(photo)}
                                <span>${escapeHtml(getPhotoFallbackLabel(photo))}</span>
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
    const analysisStrip = $('#analysis-selected-strip');
    if (analysisStrip) {
        analysisStrip.innerHTML = draftPhotos.slice(0, 4).map((photo, index) => `
            <article>
                ${renderPhotoImage(photo)}
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
                            <strong>${day.title}</strong>
                            <small>${formatPhotoPlaceMeta(day.photos.length, day.places)}</small>
                        </div>
                        <div class="album-day-thumbs">
                            ${day.photos.slice(0, 6).map((photo) => `
                                <figure>
                                    <button class="album-photo-remove" data-remove-album-photo="${escapeHtml(photo.id)}" type="button" aria-label="앨범에서 사진 제거">×</button>
                                    ${renderPhotoImage(photo)}
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
                <img src="${escapeHtml(photo.url)}" alt="" loading="lazy" decoding="async">
            </button>
        `).join('');
    }

}

function setVisibilityMode(mode) {
    state.visibility = ['private', 'link', 'public'].includes(mode) ? mode : 'private';
    $$('[data-visibility]').forEach((button) => {
        button.classList.toggle('active', button.dataset.visibility === state.visibility);
    });
    const status = $('[data-visibility-status]');
    if (status) status.textContent = getVisibilityStatusText(state.visibility);
}

function syncLandingHeroSlide(index) {
    const slides = $$('.landing-hero-slide');
    if (!slides.length) return;
    landingHeroIndex = Math.min(Math.max(Number(index) || 0, 0), slides.length - 1);
    const activeSlide = slides[landingHeroIndex];
    slides.forEach((slide, slideIndex) => slide.classList.toggle('is-active', slideIndex === landingHeroIndex));
    const place = $('[data-landing-caption-place]');
    if (place) place.textContent = activeSlide.dataset.landingSlideLabel || '';
    const nextIndex = getNextLandingSlideIndex(landingHeroIndex, slides.length);
    const nextImage = slides[nextIndex]?.querySelector('img');
    if (nextImage) nextImage.loading = 'eager';
}

function stopLandingHeroSlideshow() {
    if (landingHeroTimer === null) return;
    window.clearInterval(landingHeroTimer);
    landingHeroTimer = null;
}

function startLandingHeroSlideshow() {
    stopLandingHeroSlideshow();
    const slides = $$('.landing-hero-slide');
    syncLandingHeroSlide(landingHeroIndex);
    if (slides.length <= 1 || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    landingHeroTimer = window.setInterval(() => {
        syncLandingHeroSlide(getNextLandingSlideIndex(landingHeroIndex, slides.length));
    }, LANDING_SLIDE_INTERVAL_MS);
}

function setLandingHeroSlideshowActive(isActive) {
    if (!isActive) {
        stopLandingHeroSlideshow();
        return;
    }
    startLandingHeroSlideshow();
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
    if (!enforceVerifiedAccount('publish')) return;
    if (!enforceNewAccountLimit('publish', {
        requestedVisibility: state.visibility,
        incomingPublicCount: getPhotosBecomingPublic(getSharePhotoIds())
    })) return;
    state.isSavingShare = true;
    applyShareSaveState();
    try {
        const latestOwnAlbum = await ensureAlbumForSharing();
        if (!latestOwnAlbum) return;
        let updatedAlbum = null;
        if (latestOwnAlbum) {
            const { data, error } = await updateAlbumVisibility(latestOwnAlbum.id, state.visibility);
            if (error) throw error;
            if (data) {
                updatedAlbum = normalizeSavedAlbum(data);
                state.savedAlbums = state.savedAlbums.map((album) => (
                    album.id === data.id ? updatedAlbum : album
                ));
            }
        }
        const photoIds = getSharePhotoIds();
        const publicLocationPrecision = ['public', 'link'].includes(state.visibility) ? 'approximate' : undefined;
        const { data: updatedPhotos, error: photoVisibilityError } = await updatePhotosVisibility(photoIds, state.visibility, publicLocationPrecision);
        if (photoVisibilityError) throw photoVisibilityError;
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
        window.location.hash = completionHash;
        renderRoute(parseRouteHash(completionHash));
    } catch (error) {
        showToast(error?.message || '공개 설정을 저장하지 못했습니다.');
    } finally {
        state.isSavingShare = false;
        applyShareSaveState();
    }
}

function setProfileTab(tab) {
    state.profileTab = ['map', 'photos', 'albums'].includes(tab) ? tab : 'map';
    $$('[data-profile-tab]').forEach((button) => {
        const active = button.dataset.profileTab === state.profileTab;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
    });
    $$('[data-profile-panel]').forEach((panel) => {
        panel.classList.toggle('is-active', panel.dataset.profilePanel === state.profileTab);
    });
    if (state.profileTab === 'map' && state.selectedPublicOwnerId) {
        renderProfileMap(getPublicPhotoMapItems().filter((photo) => photo.owner_id === state.selectedPublicOwnerId || photo.albumOwnerId === state.selectedPublicOwnerId));
    }
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

function collectAlbumStoryEntriesFromDOM(album = {}) {
    const fields = $$('.trip-review-story-text');
    if (!fields.length) return parseAlbumStoryEntries(album.note);
    return fields
        .map((field) => ({
            after: String(field.dataset.tripStoryText || '').trim(),
            text: field.value.trim()
        }))
        .filter((entry) => entry.after && entry.text);
}

function updateSelectedAlbumStoryEntries(entries) {
    const album = getSelectedPublicAlbum();
    if (!album || album.owner_id !== state.currentUser?.id) return;
    const nextNote = serializeAlbumNoteWithStory(getAlbumVisibleNote(album), entries);
    updateSavedAlbumLocally(album.id, { note: nextNote });
}

function addStoryAfterTripPhoto(photoId) {
    const album = getSelectedPublicAlbum();
    if (!album || album.owner_id !== state.currentUser?.id) return;
    const text = window.prompt('사진 사이에 넣을 글귀를 적어주세요.');
    const trimmed = text?.trim();
    if (!trimmed) return;
    const entries = parseAlbumStoryEntries(album.note).filter((entry) => entry.after !== String(photoId));
    entries.push({ after: String(photoId), text: trimmed });
    updateSelectedAlbumStoryEntries(entries);
    renderPublicSurfaces();
}

function removeStoryAfterTripPhoto(photoId) {
    const album = getSelectedPublicAlbum();
    if (!album || album.owner_id !== state.currentUser?.id) return;
    const entries = collectAlbumStoryEntriesFromDOM(album).filter((entry) => entry.after !== String(photoId));
    updateSelectedAlbumStoryEntries(entries);
    renderPublicSurfaces();
}

async function saveSelectedAlbumTextEdits() {
    const album = getSelectedPublicAlbum();
    if (!album || album.owner_id !== state.currentUser?.id) return;
    const title = $('#trip-edit-title')?.value.trim();
    const note = serializeAlbumNoteWithStory(
        '',
        collectAlbumStoryEntriesFromDOM(album)
    );
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
    if (!enforceVerifiedAccount('publish')) return;
    if (!enforceNewAccountLimit('publish', {
        requestedVisibility: nextVisibility,
        incomingPublicCount: getPhotosBecomingPublic(state.albumDetailPhotos.map((photo) => photo.id))
    })) return;
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
    routeTo(APP_SECTIONS.HOME);
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
    if (summary) summary.textContent = '';
    if (!list) return;

    if (!state.albumDrafts.length) {
        list.innerHTML = `
            <article class="empty-state album-empty-state">
                <div>
                    <strong>앨범이 비어있습니다.</strong>
                    <span>개별사진을 저장한 뒤 앨범 만들기로 여행을 묶을 수 있습니다.</span>
                </div>
                <button id="btn-open-album-inline" class="btn-secondary" type="button">앨범 만들기</button>
            </article>
        `;
        return;
    }

    if (!state.albumDrafts.length) {
        list.innerHTML = `
            <article class="album-row" role="button" tabindex="0" data-myphoto-album-draft="true">
                ${getAlbumCoverStackMarkup([MAIN_BG_2_URL], '제주 4박 5일')}
                <div class="album-row-content">
                    <strong>제주 4박 5일</strong>
                    <p>사진을 업로드하거나 앨범 초안을 저장하면 이곳에 실제 앨범이 표시됩니다.</p>
                    <small><span class="album-count-icon" aria-hidden="true"></span>128장</small>
                </div>
            </article>
            <article class="album-row" role="button" tabindex="0" data-myphoto-album-draft="true">
                ${getAlbumCoverStackMarkup([MAIN_BG_5_URL], '동해 새벽 여행')}
                <div class="album-row-content">
                    <strong>동해 새벽 여행</strong>
                    <p>공개 전까지는 Home에서만 확인할 수 있는 개인 여행 기록입니다.</p>
                    <small><span class="album-count-icon" aria-hidden="true"></span>42장</small>
                </div>
            </article>
        `;
        return;
    }

    list.innerHTML = state.albumDrafts.map((album) => `
        <article class="album-row" role="button" tabindex="0" data-myphoto-album-draft="true">
            ${getAlbumCoverStackMarkup([MAIN_BG_4_URL], album.name)}
            <div class="album-row-content">
                <strong>${escapeHtml(album.name)}</strong>
                <p>${escapeHtml(getAlbumVisibleNote(album) || '비공개 앨범 초안입니다.')}</p>
                <small><span class="album-count-icon" aria-hidden="true"></span>${formatPhotoCount(state.stagedPhotos.length)}</small>
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
    if (!enforceVerifiedAccount('upload')) return;
    if (!enforceNewAccountLimit('upload', {
        incomingUploadCount: selectedPhotos.length
    })) return;
    if (!enforceAccountUploadLimit(selectedPhotos.length)) return;
    if (state.isPersistingUpload) return;
    state.isPersistingUpload = true;
    const status = $('#upload-storage-status');
    const reviewButton = $('#btn-review-upload');
    const hasLargeUpload = selectedPhotos.some((photo) => shouldOptimizePhotoForUpload(photo.file));
    if (status) status.textContent = '사진을 Supabase Storage에 저장하는 중입니다...';
    if (status && hasLargeUpload) status.textContent = '큰 사진은 3MB 이하로 정리한 뒤 저장하는 중입니다...';
    if (reviewButton) reviewButton.disabled = true;

    const saved = [];
    let pendingStoragePath = null;
    try {
        const timestamp = Date.now();
        for (const [index, photo] of selectedPhotos.entries()) {
            const id = `${timestamp}-${index}`;
            const exif = await readPhotoExif(photo.file);
            const hasExifLocation = hasUsableCoordinates(exif.lat, exif.lng);
            const storageFile = await optimizePhotoForUpload(photo.file);
            const fileName = `${state.currentUser.id}/${id}-${safeFileName(storageFile.name || photo.name)}`;
            const { url, storagePath, error: uploadError } = await uploadImage(storageFile, fileName);
            if (uploadError) throw uploadError;
            pendingStoragePath = storagePath;
            const record = {
                id,
                url,
                storage_path: storagePath,
                date: exif.date || new Date().toISOString(),
                description: '',
                lat: hasExifLocation ? exif.lat : null,
                lng: hasExifLocation ? exif.lng : null,
                liked: 0,
                shared: false,
                owner_id: state.currentUser.id,
                album: null,
                visibility: 'private',
                geo_source: hasExifLocation ? 'exif' : 'unknown',
                location_precision: 'hidden'
            };
            const { error: dbError } = await upsertPhoto(record);
            if (dbError) throw dbError;
            saved.push(normalizeSavedPhoto(record));
            pendingStoragePath = null;
        }
        state.lastSavedPhotoIds = saved.map((photo) => photo.id);
        state.savedPhotos = [
            ...saved,
            ...state.savedPhotos.filter((photo) => photo.owner_id !== state.currentUser.id || !saved.some((next) => next.id === photo.id))
        ];
        renderSavedPhotoSurfaces();
        queuePhotoAiAnalysis(saved);
        if (status) status.textContent = `${saved.length}장의 사진을 개별사진 보관함에 저장했습니다.`;
        showToast(`${saved.length}장의 사진을 저장했습니다.`);
        clearUploadQueue();
        routeTo(getUploadNextRoute(saved.length));
    } catch (error) {
        if (pendingStoragePath) await removeUploadedImage(pendingStoragePath);
        for (const record of [...saved].reverse()) {
            await deletePhoto(record.id, record.url, record.storage_path);
        }
        const failure = getUploadFailureState({ online: navigator.onLine });
        if (status) status.textContent = `${failure.title} ${failure.body}`;
        showToast(failure.title);
    } finally {
        state.isPersistingUpload = false;
        renderStagedPhotos();
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
            return;
        } else if (album) {
            const savedAlbum = normalizeSavedAlbum(album);
            state.savedAlbums.unshift(savedAlbum);
            state.selectedPublicAlbumId = savedAlbum.id;
            if (draftPhotoIds.length) {
                const { error: attachError } = await attachPhotosToAlbum(album.id, draftPhotoIds);
                if (attachError) {
                    await deleteAlbum(album.id);
                    showToast('앨범 사진 연결에 실패했습니다.');
                    return;
                }
            }
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

function getPhotosBecomingPublic(photoIds = []) {
    const ids = new Set((photoIds || []).filter(Boolean).map((id) => id.toString()));
    return getMySavedPhotos().filter((photo) => (
        ids.has(photo.id?.toString())
        && photo.visibility !== 'public'
        && !photo.shared
    )).length;
}

function enforceNewAccountLimit(action, options = {}) {
    const status = getNewAccountLimitStatus({
        user: state.currentUser,
        photos: state.savedPhotos,
        ...options
    });
    const isBlocked = action === 'upload' ? !status.canUpload : !status.canPublish;
    if (!isBlocked) return true;
    const message = getNewAccountLimitMessage(status, action);
    if (message) showToast(message);
    return false;
}

function enforceAccountUploadLimit(incomingUploadCount = 0) {
    const status = getAccountUploadLimitStatus({
        user: state.currentUser,
        photos: state.savedPhotos,
        incomingUploadCount
    });
    if (status.canUpload) return true;
    showToast(getAccountUploadLimitMessage(status));
    renderStagedPhotos();
    return false;
}

function isCurrentUserEmailVerified() {
    return isVerifiedAccount(state.currentUser);
}

function enforceVerifiedAccount(action) {
    if (isCurrentUserEmailVerified()) return true;
    const message = action === 'upload'
        ? '이메일 인증을 완료하면 사진을 업로드할 수 있어요.'
        : '이메일 인증을 완료하면 사진을 공개할 수 있어요.';
    showToast(message);
    const authMessage = $('#auth-message');
    if (authMessage) authMessage.textContent = message;
    return false;
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

    const editingAlbum = state.editingAlbumId
        ? state.savedAlbums.find((album) => album.id === state.editingAlbumId)
        : null;
    const note = serializeAlbumNoteWithStory(
        noteInput?.value.trim() || '',
        parseAlbumStoryEntries(editingAlbum?.note)
    );
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
        const { error: replaceError } = await replaceAlbumPhotos(savedAlbum.id, draftPhotoIds);
        if (replaceError) {
            if (!editingAlbumId) await deleteAlbum(savedAlbum.id);
            showToast('앨범 사진 연결에 실패했습니다.');
            return;
        }
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
    if (photoIds.length) {
        const { error: attachError } = await attachPhotosToAlbum(album.id, photoIds);
        if (attachError) {
            await deleteAlbum(album.id);
            showToast('앨범 사진 연결에 실패했습니다.');
            return null;
        }
    }
    await loadPublicProfileNames();
    return album;
}

function getEditablePhoto() {
    return getLocationEditorPhoto(getMySavedPhotos(), state.selectedLocationPhotoId || state.selectedPhotoId);
}

function setLocationEditorCoordinateFields(lat, lng) {
    const latInput = $('#location-lat-input');
    const lngInput = $('#location-lng-input');
    if (latInput) latInput.value = Number.isFinite(lat) ? lat.toFixed(6) : '';
    if (lngInput) lngInput.value = Number.isFinite(lng) ? lng.toFixed(6) : '';
}

function setLocationEditorPickMode(enabled) {
    state.locationEditorPickMode = Boolean(enabled);
    const button = $('#btn-pick-photo-location');
    const modal = $('#location-editor-modal');
    modal?.classList.toggle('is-map-picking', state.locationEditorPickMode);
    button?.classList.toggle('active', state.locationEditorPickMode);
    if (button) {
        button.textContent = state.locationEditorPickMode ? '위치 지정 완료' : '지도에서 위치수정';
        button.setAttribute('aria-pressed', state.locationEditorPickMode ? 'true' : 'false');
    }
    state.locationEditorMarker?.setDraggable(state.locationEditorPickMode);
    window.requestAnimationFrame(() => {
        const maps = window.google?.maps;
        const map = state.locationEditorMap;
        const markerPosition = state.locationEditorMarker?.getPosition?.();
        if (!maps || !map) return;
        maps.event.trigger(map, 'resize');
        if (markerPosition) map.setCenter(markerPosition);
    });
    const message = $('#location-editor-message');
    if (message && state.locationEditorPickMode) {
        message.textContent = '지도에서 새 위치를 클릭하거나 핀을 드래그해 위치를 수정합니다.';
    } else if (message) {
        message.textContent = '위치가 지정되었습니다. 다시 바꾸려면 지도에서 위치수정을 눌러주세요.';
    }
}

async function ensureLocationEditorMap(center, { zoom = null, updateViewport = true } = {}) {
    const container = $('#location-editor-map-canvas');
    if (!container) return null;
    const maps = await loadGoogleMapsApi();
    if (!maps) {
        renderMapUnavailable(container);
        return null;
    }
    const position = { lat: Number(center.lat), lng: Number(center.lng) };
    if (!state.locationEditorMap) {
        state.locationEditorMap = new maps.Map(container, getLocationEditorMapOptions(position, {
            mapId: state.googleMapsMapId,
            zoom: Number.isFinite(zoom) ? zoom : 13
        }));
        state.locationEditorMarker = createGoogleMapsMarker(maps, {
            map: state.locationEditorMap,
            position,
            draggable: state.locationEditorPickMode
        }, { mapId: state.googleMapsMapId });
        state.locationEditorMarker.addListener('dragend', () => {
            if (!state.locationEditorPickMode) return;
            const next = state.locationEditorMarker.getPosition();
            applyLocationEditorPosition(next.lat(), next.lng(), { center: false });
        });
        state.locationEditorMapClickListener = state.locationEditorMap.addListener('click', (event) => {
            if (!state.locationEditorPickMode || !event.latLng) return;
            applyLocationEditorPosition(event.latLng.lat(), event.latLng.lng(), { center: false });
        });
    }
    if (updateViewport) state.locationEditorMap.setCenter(position);
    if (Number.isFinite(zoom)) state.locationEditorMap.setZoom(zoom);
    return state.locationEditorMap;
}

async function applyLocationEditorPosition(lat, lng, options = {}) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const position = { lat, lng };
    setLocationEditorCoordinateFields(lat, lng);
    const map = await ensureLocationEditorMap(position, { updateViewport: options.center !== false });
    if (!map) return;
    state.locationEditorMarker?.setPosition(position);
    if (options.center !== false) map.setCenter(position);
}

async function updateLocationEditorMap(lat, lng, { zoom = 13 } = {}) {
    const position = { lat, lng };
    setLocationEditorCoordinateFields(lat, lng);
    const map = await ensureLocationEditorMap(position, { zoom });
    state.locationEditorMarker?.setPosition(position);
    return map;
}

function setLocationEditorPhoto(photoId) {
    const photo = getLocationEditorPhoto(getMySavedPhotos(), photoId);
    const descriptionInput = $('#photo-description-input');
    const dateInput = $('#photo-date-input');
    const message = $('#location-editor-message');
    const draft = normalizeLocationDraft(photo);
    const hasSavedLocation = hasCompleteLocation(photo);

    state.selectedLocationPhotoId = photo?.id || null;
    setLocationEditorPickMode(false);
    setLocationEditorCoordinateFields(Number(draft.lat), Number(draft.lng));
    if (descriptionInput) descriptionInput.value = photo?.description || '';
    if (dateInput) dateInput.value = formatPhotoDateInput(photo?.date);
    updateLocationEditorMap(Number(draft.lat), Number(draft.lng), { zoom: hasSavedLocation ? 13 : 7 });
    state.editingPhotoVisibility = photo?.visibility === 'public' || photo?.shared ? 'public' : 'private';
    state.editingPhotoLocationPrecision = normalizeLocationPrecision(photo?.location_precision);
    $$('[data-photo-visibility]').forEach((button) => {
        button.classList.toggle('active', button.dataset.photoVisibility === state.editingPhotoVisibility);
    });
    $$('[data-photo-location-precision]').forEach((button) => {
        button.classList.toggle('active', button.dataset.photoLocationPrecision === state.editingPhotoLocationPrecision);
    });
    if (message) {
        message.textContent = photo
            ? `${getPhotoFallbackLabel(photo, '선택한 사진')}의 위치를 직접 지정합니다.`
            : '저장된 사진이 없어서 화면 흐름만 확인할 수 있습니다.';
    }
}

function openLocationEditor(eventOrPhotoId) {
    const photoId = typeof eventOrPhotoId === 'string'
        ? eventOrPhotoId
        : eventOrPhotoId?.currentTarget?.dataset?.photoId || state.selectedPhotoId;
    const photo = getLocationEditorPhoto(getMySavedPhotos(), photoId);
    const latInput = $('#location-lat-input');
    const lngInput = $('#location-lng-input');
    const message = $('#location-editor-message');
    if (latInput || lngInput) {
        const draft = normalizeLocationDraft(photo);
        setLocationEditorCoordinateFields(Number(draft.lat), Number(draft.lng));
    }
    if (message) {
        message.textContent = photo
            ? `${getPhotoFallbackLabel(photo, '선택한 사진')}의 위치를 수정합니다.`
            : '저장된 사진이 없으면 화면에서만 위치 지정 흐름을 확인할 수 있습니다.';
    }
    openModal('#location-editor-modal');
    setLocationEditorPhoto(photo?.id || null);
}

async function startLocationEditorMapPick() {
    const nextPickMode = !state.locationEditorPickMode;
    setLocationEditorPickMode(nextPickMode);
    const lat = Number($('#location-lat-input')?.value);
    const lng = Number($('#location-lng-input')?.value);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
        await updateLocationEditorMap(lat, lng);
    }
}

async function saveManualLocation(event) {
    event.preventDefault();
    const lat = Number($('#location-lat-input')?.value);
    const lng = Number($('#location-lng-input')?.value);
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

    if (!enforceVerifiedAccount('publish')) return;
    if (!enforceNewAccountLimit('publish', {
        requestedVisibility: state.editingPhotoVisibility,
        incomingPublicCount: getPhotosBecomingPublic([photo.id])
    })) return;

    if (message) message.textContent = '위치를 저장하는 중입니다...';
    const { data, error } = await updatePhotoInfo(photo.id, {
        description,
        date: dateValue ? new Date(dateValue).toISOString() : photo.date,
        lat,
        lng,
        visibility: state.editingPhotoVisibility,
        location_precision: state.editingPhotoLocationPrecision,
        geo_source: 'manual'
    });
    if (error) {
        if (message) message.textContent = error.message || '위치 저장에 실패했습니다.';
        return;
    }
    const updated = normalizeSavedPhoto({
        ...photo,
        ...data,
        url: photo.url,
        storage_path: data?.storage_path || photo.storage_path
    });
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
    if (event.currentTarget?.classList.contains('uses-place-autocomplete')) return;
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
    if (state.authMode === 'signup') {
        await handleSignup();
        return;
    }
    const email = $('#email-input')?.value.trim();
    const password = $('#password-input')?.value;
    const message = $('#auth-message');
    if (!email || !password) return;
    if (message) message.textContent = '\uB85C\uADF8\uC778 \uC911\uC785\uB2C8\uB2E4...';
    const { user, error } = await signInWithEmail(email, password, {
        captchaToken: getTurnstileToken()
    });
    resetTurnstile();
    if (error) {
        if (message) message.textContent = error.message || '\uB85C\uADF8\uC778\uC5D0 \uC2E4\uD328\uD588\uC5B4\uC694.';
        return;
    }
    state.currentUser = user;
    await ensureCurrentUserPublicProfile();
    updateAccountUI();
    await loadSavedLibrary();
    closeModals();
    showToast('\uB85C\uADF8\uC778\uD588\uC5B4\uC694.');
    await runPendingAuthAction();
}

async function handleSignup() {
    const email = $('#email-input')?.value.trim();
    const password = $('#password-input')?.value;
    const message = $('#auth-message');
    if (!email || !password) return;
    if (message) message.textContent = '\uAC00\uC785 \uC911\uC785\uB2C8\uB2E4...';
    const { error } = await signUpWithEmail(email, password, {
        captchaToken: getTurnstileToken(),
        redirectTo: getOAuthRedirectUrl(window.location)
    });
    resetTurnstile();
    if (error) {
        if (message) message.textContent = error.message || '\uAC00\uC785\uC5D0 \uC2E4\uD328\uD588\uC5B4\uC694.';
        return;
    }
    const verificationMessage = '\uC774\uBA54\uC77C \uC778\uC99D \uB9C1\uD06C\uB97C \uBCF4\uB0C8\uC5B4\uC694. \uBA54\uC77C\uD568\uC5D0\uC11C \uC778\uC99D\uC744 \uC644\uB8CC\uD55C \uB4A4 \uB85C\uADF8\uC778\uD574\uC8FC\uC138\uC694.';
    if (message) message.textContent = verificationMessage;
    showToast(verificationMessage);
}

async function handlePasswordReset() {
    const email = $('#email-input')?.value.trim();
    const message = $('#auth-message');
    if (!email) {
        if (message) message.textContent = '\uBE44\uBC00\uBC88\uD638 \uC7AC\uC124\uC815 \uB9C1\uD06C\uB97C \uBC1B\uC744 \uC774\uBA54\uC77C\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.';
        return;
    }
    if (message) message.textContent = '\uBE44\uBC00\uBC88\uD638 \uC7AC\uC124\uC815 \uBA54\uC77C\uC744 \uBCF4\uB0B4\uB294 \uC911\uC785\uB2C8\uB2E4...';
    const { error } = await resetPasswordForEmail(email, {
        captchaToken: getTurnstileToken(),
        redirectTo: getOAuthRedirectUrl(window.location)
    });
    resetTurnstile();
    if (error) {
        if (message) message.textContent = error.message || '\uBE44\uBC00\uBC88\uD638 \uC7AC\uC124\uC815 \uBA54\uC77C\uC744 \uBCF4\uB0B4\uC9C0 \uBABB\uD588\uC5B4\uC694.';
        return;
    }
    const resetMessage = '\uBE44\uBC00\uBC88\uD638 \uC7AC\uC124\uC815 \uB9C1\uD06C\uB97C \uC774\uBA54\uC77C\uB85C \uBCF4\uB0C8\uC5B4\uC694.';
    if (message) message.textContent = resetMessage;
    showToast(resetMessage);
}

async function handlePasswordRecoverySubmit(event) {
    event.preventDefault();
    const password = $('#new-password-input')?.value || '';
    const confirmation = $('#confirm-password-input')?.value || '';
    const message = $('#password-recovery-message');
    const submitButton = $('#btn-update-password');

    if (password.length < 8) {
        if (message) message.textContent = '새 비밀번호는 8자 이상 입력해주세요.';
        return;
    }
    if (password !== confirmation) {
        if (message) message.textContent = '새 비밀번호가 서로 일치하지 않습니다.';
        return;
    }

    if (submitButton) submitButton.disabled = true;
    if (message) message.textContent = '비밀번호를 변경하는 중입니다...';
    const { error } = await updatePassword(password);
    if (error) {
        if (submitButton) submitButton.disabled = false;
        if (message) message.textContent = '비밀번호를 변경하지 못했어요. 재설정 링크를 다시 요청해주세요.';
        return;
    }

    if (message) message.textContent = '비밀번호를 변경했습니다. 새 비밀번호로 다시 로그인해주세요.';
    await signOut();
    window.setTimeout(() => window.location.replace(`${window.location.origin}/#/`), 800);
}

async function handleSocialLogin(provider) {
    const message = $('#auth-message');
    if (isLikelyEmbeddedOAuthBrowser(window.navigator?.userAgent)) {
        const browserMessage = getEmbeddedOAuthBrowserMessage(provider);
        if (message) message.textContent = browserMessage;
        showToast(browserMessage);
        return;
    }

    if (message) message.textContent = `${provider === 'google' ? 'Google' : 'Kakao'} 로그인으로 이동합니다...`;
    storePendingAuthContext(window.localStorage, state, {
        route: getCurrentRoute(),
        visibility: state.visibility,
        albumId: state.selectedPublicAlbumId
    });
    setPendingOAuthProvider(window.localStorage, provider);
    const { error } = provider === 'google'
        ? await signInWithGoogle()
        : await signInWithKakao();
    if (error) {
        takePendingOAuthProvider(window.localStorage);
        if (message) message.textContent = error.message || '소셜 로그인으로 이동하지 못했습니다.';
    }
}

async function runPendingAuthAction() {
    const route = takePendingAuthRoute(state);
    if (route) {
        routeTo(route);
        return;
    }
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
    $('#btn-open-liked-photos')?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        routeTo('liked');
    }, true);
    $$('[data-route]').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            routeTo(link.dataset.route);
        });
    });
    $('#btn-open-upload')?.addEventListener('click', () => routeTo('upload'));
    $('#btn-open-photos')?.addEventListener('click', () => routeTo('photos'));
    $('#btn-upload-more-photos')?.addEventListener('click', () => routeTo('upload'));
    $('#btn-open-album-from-photos')?.addEventListener('click', startNewAlbum);
    $('#btn-delete-selected-photos')?.addEventListener('click', deleteSelectedPersonalPhotos);
    $('#btn-dismiss-missing-location')?.addEventListener('click', () => {
        state.isMissingLocationBannerDismissed = true;
        renderSavedPhotoSurfaces();
        renderAccountNotifications();
    });
    $('#btn-open-album')?.addEventListener('click', startNewAlbum);
    $('#btn-open-album-inline')?.addEventListener('click', startNewAlbum);
    $$('[data-my-library-tab]').forEach((button) => button.addEventListener('click', () => setMyLibraryTab(button.dataset.myLibraryTab)));
    $('#landing-search')?.addEventListener('submit', submitLandingSearch);
    $('#landing-search-input')?.addEventListener('input', syncLandingSearchQuery);
    $('#landing-search-input')?.addEventListener('search', syncLandingSearchQuery);
    $$('[data-landing-query]').forEach((button) => button.addEventListener('click', () => {
        const input = $('#landing-search-input');
        if (input) input.value = button.dataset.landingQuery || '';
        state.landingSearchQuery = button.dataset.landingQuery || '';
        state.landingVisibleCounts = {};
        renderLandingSections();
    }));
    $('#landing-admin-form')?.addEventListener('submit', saveLandingAdminForm);
    $('#btn-add-landing-section')?.addEventListener('click', () => {
        state.landingSections.push({
            id: crypto.randomUUID(),
            title: '새 여행 주제',
            description: '',
            sort_order: state.landingSections.length,
            is_visible: true,
            photo_ids: []
        });
        renderLandingAdminForm();
    });
    $('#btn-load-street-view')?.addEventListener('click', loadPhotoDetailStreetView);
    $('#photo-detail-modal .photo-detail-media-column')?.addEventListener('scroll', syncPhotoDetailScrollCue, { passive: true });
    $('#photo-detail-modal .photo-detail-card')?.addEventListener('scroll', syncPhotoDetailScrollCue, { passive: true });
    $('#photo-detail-modal [data-photo-detail-image]')?.addEventListener('load', syncPhotoDetailScrollCue);
    $('#photo-detail-street-view-static')?.addEventListener('load', syncPhotoDetailScrollCue);
    $$('[data-go-myphoto]').forEach((button) => button.addEventListener('click', () => routeTo(APP_SECTIONS.HOME)));
    $$('[data-go-album]').forEach((button) => button.addEventListener('click', () => routeTo('album')));
    $$('[data-go-trip]').forEach((button) => {
        button.addEventListener('click', () => routeToTrip(button.dataset.publicAlbumId));
    });
    $$('[data-go-profile]').forEach((button) => {
        button.addEventListener('click', () => routeToProfileFromAuthor(button.dataset.publicAlbumId, button.dataset.publicOwnerId));
    });
    $$('[data-open-photo-detail]').forEach((button) => button.addEventListener('click', () => {
        const context = document.body.dataset.page === 'trip' ? 'album' : 'photo';
        updatePhotoDetailModal(getDefaultDetailPhoto(), { context });
        openModal('#photo-detail-modal');
    }));
    document.addEventListener('click', async (event) => {
        if (!(event.target instanceof Element)) return;
        if (!event.target.closest('.account-menu-shell')) setAccountMenuOpen(false);
        if (!event.target.closest('.account-notification-shell')) setAccountNotificationsOpen(false);
        if (state.isExplorePhotoScopeMenuOpen && !event.target.closest('.explore-photo-scope')) {
            setExplorePhotoScopeMenuOpen(false);
        }

        const retryLibraryButton = event.target.closest('[data-retry-saved-library]');
        if (retryLibraryButton) {
            retryLibraryButton.disabled = true;
            await retrySavedLibrary();
            return;
        }

        const adminSectionAction = event.target.closest('[data-admin-section-move], [data-admin-section-remove]');
        if (adminSectionAction) {
            syncLandingAdminDrafts();
            const fieldset = adminSectionAction.closest('[data-admin-landing-section]');
            const index = state.landingSections.findIndex((section) => String(section.id) === fieldset?.dataset.adminLandingSection);
            if (index < 0) return;
            if (adminSectionAction.hasAttribute('data-admin-section-remove')) {
                const sectionId = state.landingSections[index].id;
                if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(sectionId)) {
                    const { error } = await deleteLandingSection(sectionId);
                    if (error) {
                        $('#landing-admin-message') && ($('#landing-admin-message').textContent = error.message || '섹션을 삭제하지 못했습니다.');
                        return;
                    }
                }
                state.landingSections.splice(index, 1);
            } else {
                const direction = adminSectionAction.dataset.adminSectionMove === 'previous' ? -1 : 1;
                const targetIndex = index + direction;
                if (targetIndex >= 0 && targetIndex < state.landingSections.length) {
                    [state.landingSections[index], state.landingSections[targetIndex]] = [state.landingSections[targetIndex], state.landingSections[index]];
                }
            }
            renderLandingAdminForm();
            return;
        }

        const adminPhotoToggle = event.target.closest('[data-admin-photo-toggle]');
        if (adminPhotoToggle) {
            syncLandingAdminDrafts();
            const fieldset = adminPhotoToggle.closest('[data-admin-landing-section]');
            const section = state.landingSections.find((candidate) => String(candidate.id) === fieldset?.dataset.adminLandingSection);
            if (!section) return;
            const photoId = adminPhotoToggle.dataset.adminPhotoToggle;
            if (!section.photo_ids.includes(photoId) && section.photo_ids.length >= LANDING_TAG_PIN_LIMIT) {
                const message = $('#landing-admin-message');
                if (message) message.textContent = '상단에 고정할 사진은 최대 20장까지 선택할 수 있습니다.';
                return;
            }
            section.photo_ids = section.photo_ids.includes(photoId)
                ? section.photo_ids.filter((id) => id !== photoId)
                : [...section.photo_ids, photoId];
            renderLandingAdminForm();
            return;
        }

        const adminPhotoMove = event.target.closest('[data-admin-photo-move]');
        if (adminPhotoMove) {
            syncLandingAdminDrafts();
            const fieldset = adminPhotoMove.closest('[data-admin-landing-section]');
            const section = state.landingSections.find((candidate) => String(candidate.id) === fieldset?.dataset.adminLandingSection);
            const selected = adminPhotoMove.closest('[data-admin-selected-photo]');
            if (!section || !selected) return;
            const index = section.photo_ids.indexOf(selected.dataset.adminSelectedPhoto);
            const targetIndex = index + (adminPhotoMove.dataset.adminPhotoMove === 'previous' ? -1 : 1);
            if (index >= 0 && targetIndex >= 0 && targetIndex < section.photo_ids.length) {
                [section.photo_ids[index], section.photo_ids[targetIndex]] = [section.photo_ids[targetIndex], section.photo_ids[index]];
            }
            renderLandingAdminForm();
            return;
        }

        const accountRouteButton = event.target.closest('[data-account-route]');
        if (accountRouteButton) {
            setAccountMenuOpen(false);
            if (accountRouteButton.dataset.accountRoute === 'profile') openAccountProfilePage();
            else routeTo(accountRouteButton.dataset.accountRoute);
            return;
        }

        const landingPhotoButton = event.target.closest('[data-landing-photo-id]');
        if (landingPhotoButton) {
            const photo = getLandingPublicPhotos().find((candidate) => String(candidate.id || candidate.localId) === landingPhotoButton.dataset.landingPhotoId);
            if (photo) {
                updatePhotoDetailModal(photo, { context: 'explore' });
                openModal('#photo-detail-modal');
            }
            return;
        }

        const landingViewAllButton = event.target.closest('[data-landing-view-all]');
        if (landingViewAllButton) {
            routeToLandingTag(landingViewAllButton.dataset.landingViewAll);
            return;
        }

        const landingTagRegionButton = event.target.closest('[data-landing-tag-region]');
        if (landingTagRegionButton) {
            state.landingTagRegion = landingTagRegionButton.dataset.landingTagRegion || '';
            state.landingTagPage = 1;
            renderLandingTagPage();
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            return;
        }

        const landingTagPageButton = event.target.closest('[data-landing-tag-page]');
        if (landingTagPageButton && !landingTagPageButton.disabled) {
            state.landingTagPage += landingTagPageButton.dataset.landingTagPage === 'previous' ? -1 : 1;
            renderLandingTagPage();
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            return;
        }

        const landingScrollButton = event.target.closest('[data-landing-scroll-direction]');
        if (landingScrollButton) {
            const row = landingScrollButton.closest('[data-landing-section]')?.querySelector('[data-landing-scroll]');
            if (row) {
                const direction = landingScrollButton.dataset.landingScrollDirection === 'previous' ? -1 : 1;
                row.scrollBy({ left: direction * Math.max(280, row.clientWidth * 0.82), behavior: 'smooth' });
                window.setTimeout(() => {
                    loadMoreLandingSectionPhotos(row);
                    updateLandingScrollButtons(row);
                }, 360);
            }
            return;
        }

        if (event.target.closest('[data-start-album]')) {
            startNewAlbum();
            return;
        }

        if (event.target.closest('[data-retry-map]')) {
            window.location.reload();
            return;
        }

        const homePhotoDetailButton = event.target.closest('[data-home-photo-detail]');
        if (homePhotoDetailButton) {
            openHomeReferencePhotoDetail(homePhotoDetailButton);
            return;
        }

        const accountProfileLogout = event.target.closest('#account-profile-logout');
        if (accountProfileLogout) {
            await handleLogout();
            return;
        }

        const preview = $('#explore-pin-preview');
        const explorePreviewPhoto = event.target.closest('[data-pin-preview-photo]');
        if (explorePreviewPhoto && preview?.classList.contains('is-expanded')) {
            setExplorePreviewExpanded(false);
            return;
        }
        const previewAction = getExplorePreviewExpansionAction({
            clickedPreviewPhoto: Boolean(explorePreviewPhoto),
            clickedInsidePreview: Boolean(preview?.contains(event.target)),
            isExpanded: Boolean(preview?.classList.contains('is-expanded'))
        });
        if (previewAction === 'expand') {
            setExplorePreviewExpanded(true);
            return;
        }
        if (previewAction === 'collapse') setExplorePreviewExpanded(false);

        const editPinPreviewButton = event.target.closest('#btn-edit-pin-preview');
        if (editPinPreviewButton) {
            setExplorePreviewEditMode(true);
            return;
        }

        const cancelPinPreviewEditButton = event.target.closest('[data-cancel-pin-preview-edit]');
        if (cancelPinPreviewEditButton) {
            setExplorePreviewEditMode(false);
            return;
        }

        const previewVisibilityButton = event.target.closest('[data-preview-visibility]');
        if (previewVisibilityButton) {
            setExplorePreviewVisibility(previewVisibilityButton.dataset.previewVisibility);
            return;
        }

        const routeButton = event.target.closest('[data-route]');
        if (routeButton) {
            event.preventDefault();
            setAccountNotificationsOpen(false);
            routeTo(routeButton.dataset.route);
            return;
        }

        const photoPageButton = event.target.closest('[data-photo-page][data-page-direction]');
        if (photoPageButton) {
            const pageOffset = photoPageButton.dataset.pageDirection === 'next' ? 1 : -1;
            if (photoPageButton.dataset.photoPage === 'liked') {
                state.likedPhotoPage += pageOffset;
                renderLikedPhotoSurfaces();
                $('#liked-photo-full-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                state.personalPhotoPage += pageOffset;
                renderPersonalPhotosPage();
                $('#personal-photo-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            return;
        }

        const photoLikeButton = event.target.closest('[data-toggle-photo-like]');
        if (photoLikeButton) {
            event.preventDefault();
            event.stopPropagation();
            toggleSelectedPhotoLike({ currentTarget: photoLikeButton });
            return;
        }

        const photoFullscreenButton = event.target.closest('[data-open-photo-fullscreen]');
        if (photoFullscreenButton) {
            event.preventDefault();
            openPhotoFullscreenFromDetail();
            return;
        }

        const photoFullscreenBackButton = event.target.closest('[data-photo-fullscreen-back]');
        if (photoFullscreenBackButton) {
            event.preventDefault();
            returnToPhotoDetailFromFullscreen();
            return;
        }

        const photoDetailMoreButton = event.target.closest('[data-photo-detail-more]');
        if (photoDetailMoreButton) {
            event.preventDefault();
            const isOpen = photoDetailMoreButton.getAttribute('aria-expanded') === 'true';
            setPhotoDetailMoreMenuOpen(!isOpen);
            return;
        }

        const reportPhotoButton = event.target.closest('[data-report-photo]');
        if (reportPhotoButton) {
            event.preventDefault();
            setPhotoDetailMoreMenuOpen(false);
            showToast('신고가 접수되었습니다. 검토 후 조치하겠습니다.');
            return;
        }

        if (!event.target.closest('.photo-detail-more')) setPhotoDetailMoreMenuOpen(false);

        const exploreScopeTrigger = event.target.closest('[data-explore-scope-trigger]');
        if (exploreScopeTrigger) {
            setExplorePhotoScopeMenuOpen(!state.isExplorePhotoScopeMenuOpen);
            return;
        }

        const exploreScopeButton = event.target.closest('[data-explore-scope]');
        if (exploreScopeButton) {
            setExplorePhotoScope(exploreScopeButton.dataset.exploreScope);
            return;
        }

        const mobileDiscoveryButton = event.target.closest('#btn-toggle-explore-mobile-list');
        if (mobileDiscoveryButton) {
            toggleExploreMobileDiscoveryPanel();
            return;
        }

        const collapsedDiscoveryPanel = event.target.closest('#explore-list.is-collapsed');
        if (collapsedDiscoveryPanel) {
            toggleExploreDiscoveryPanel();
            return;
        }

        const discoveryToggleButton = event.target.closest('#btn-toggle-explore-discovery');
        if (discoveryToggleButton) {
            toggleExploreDiscoveryPanel();
            return;
        }

        const discoveryPhotoButton = event.target.closest('[data-explore-discovery-photo]');
        if (discoveryPhotoButton) {
            const photo = state.exploreMarkerPhotos.find((candidate) => candidate.id === discoveryPhotoButton.dataset.exploreDiscoveryPhoto)
                || getExplorePhotoMapItems().find((candidate) => candidate.id === discoveryPhotoButton.dataset.exploreDiscoveryPhoto);
            openExplorePhotoPreview(photo, { focusMap: true });
            return;
        }

        const goMyphotoButton = event.target.closest('[data-go-myphoto]');
        if (goMyphotoButton) {
            routeTo(APP_SECTIONS.HOME);
            return;
        }

        const goAlbumButton = event.target.closest('[data-go-album]');
        if (goAlbumButton) {
            routeTo('album');
            return;
        }

        const goTripButton = event.target.closest('[data-go-trip]');
        if (goTripButton) {
            routeToTrip(goTripButton.dataset.publicAlbumId);
            return;
        }

        const openAlbumInlineButton = event.target.closest('#btn-open-album-inline');
        if (openAlbumInlineButton) {
            startNewAlbum();
            return;
        }

        const editAlbumButton = event.target.closest('#btn-edit-album');
        if (editAlbumButton) {
            startEditSelectedAlbum();
            return;
        }

        const albumMenuAction = event.target.closest('[data-album-action]');
        if (albumMenuAction) {
            const action = albumMenuAction.dataset.albumAction;
            albumMenuAction.closest('.album-more-menu')?.removeAttribute('open');
            if (action === 'edit') startEditSelectedAlbum();
            if (action === 'cover') setSelectedAlbumCoverFromFirstPhoto();
            if (action === 'delete') deleteSelectedAlbum();
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

        const addTripStoryButton = event.target.closest('[data-add-trip-story-after]');
        if (addTripStoryButton) {
            event.preventDefault();
            event.stopPropagation();
            addStoryAfterTripPhoto(addTripStoryButton.dataset.addTripStoryAfter);
            return;
        }

        const removeTripStoryButton = event.target.closest('[data-remove-trip-story]');
        if (removeTripStoryButton) {
            event.preventDefault();
            event.stopPropagation();
            removeStoryAfterTripPhoto(removeTripStoryButton.dataset.removeTripStory);
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
            const photoCard = removeTripPhotoButton.closest('.trip-review-photo-card');
            if (photoCard?.classList.contains('is-removing')) return;
            photoCard?.classList.add('is-removing');
            window.setTimeout(() => {
                removePhotoFromSelectedAlbum(
                    removeTripPhotoButton.dataset.removeTripPhoto,
                    removeTripPhotoButton.dataset.removeTripPhotoIndex
                );
            }, 180);
            return;
        }

        const tripDateButton = event.target.closest('[data-trip-review-date]');
        if (tripDateButton) {
            state.tripReviewDateFilter = tripDateButton.dataset.tripReviewDate || null;
            state.tripReviewFocusPhotoId = null;
            setTripReviewMapLoading(true);
            updateTripReviewDateFilterUI();
            renderTripReviewMap(state.albumDetailPhotos);
            return;
        }

        const clearTripDateButton = event.target.closest('[data-clear-trip-review-date]');
        if (clearTripDateButton) {
            state.tripReviewDateFilter = null;
            state.tripReviewFocusPhotoId = null;
            setTripReviewMapLoading(true);
            updateTripReviewDateFilterUI();
            renderTripReviewMap(state.albumDetailPhotos);
            return;
        }

        const showPhotoOnMapButton = event.target.closest('[data-show-photo-on-map]');
        if (showPhotoOnMapButton) {
            const photoId = String(showPhotoOnMapButton.dataset.photoId || '');
            const photo = getAllDisplayPhotos().find((candidate) => String(candidate.id || candidate.localId) === photoId)
                || state.albumDetailPhotos.find((candidate) => getTripReviewPhotoId(candidate) === photoId)
                || getLandingPublicPhotos().find((candidate) => String(candidate.id || candidate.localId) === photoId)
                || getExplorePhotoMapItems().find((candidate) => String(candidate.id || candidate.localId) === photoId);
            if (!photo) return;
            await openPhotoOnExploreMap(photo);
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
            await shareCurrentTripWithKakao();
            return;
        }

        const photoDetailAuthorButton = event.target.closest('[data-photo-detail-author]');
        if (photoDetailAuthorButton) {
            closeModals();
            routeToProfileFromAuthor(
                photoDetailAuthorButton.dataset.publicAlbumId,
                photoDetailAuthorButton.dataset.publicOwnerId
            );
            return;
        }

        const goProfileButton = event.target.closest('[data-go-profile]');
        if (goProfileButton) {
            routeToProfileFromAuthor(goProfileButton.dataset.publicAlbumId, goProfileButton.dataset.publicOwnerId);
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

        const locationPrecisionButton = event.target.closest('[data-photo-location-precision]');
        if (locationPrecisionButton) {
            state.editingPhotoLocationPrecision = normalizeLocationPrecision(locationPrecisionButton.dataset.photoLocationPrecision);
            $$('[data-photo-location-precision]').forEach((button) => {
                button.classList.toggle('active', button === locationPrecisionButton);
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
            state.lastToggledPersonalPhotoId = personalPhotoToggle.dataset.togglePersonalPhoto || null;
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
            const isTripPhoto = Boolean(photoCard.closest('#public-trip-photo-grid'));
            const isLikedPhoto = Boolean(photoCard.closest('#liked-photo-grid, #liked-photo-full-grid'));
            const photo = isTripPhoto
                ? state.albumDetailPhotos.find((candidate) => getTripReviewPhotoId(candidate) === String(photoCard.dataset.photoId))
                : getAllDisplayPhotos().find((candidate) => candidate.id === photoCard.dataset.photoId);
            const context = isTripPhoto
                ? (document.body.dataset.page === 'tag' ? 'explore' : 'album')
                : (isLikedPhoto ? 'liked' : 'photo');
            updatePhotoDetailModal(photo || getDefaultDetailPhoto(), { context });
            openModal('#photo-detail-modal');
            return;
        }

        const photoDetailButton = event.target.closest('[data-open-photo-detail]');
        if (photoDetailButton) {
            const context = document.body.dataset.page === 'trip' ? 'album' : 'photo';
            updatePhotoDetailModal(getDefaultDetailPhoto(), { context });
            openModal('#photo-detail-modal');
            return;
        }

        const locationButton = event.target.closest('[data-open-photo-editor]');
        if (locationButton) {
            const photoId = locationButton.dataset.photoId || state.selectedPhotoId;
            const editablePhoto = getLocationEditorPhoto(getMySavedPhotos(), photoId);
            if (!state.currentUser?.id || !editablePhoto || editablePhoto.owner_id !== state.currentUser.id) {
                showToast('본인 사진만 수정할 수 있습니다.');
                return;
            }
            openLocationEditor({ currentTarget: locationButton });
            return;
        }

        const explorePhotoPin = event.target.closest('[data-explore-photo-pin]');
        if (explorePhotoPin) {
            const photo = getExplorePhotoMapItems().find((candidate) => candidate.id === explorePhotoPin.dataset.explorePhotoPin);
            openExplorePhotoPreview(photo, { focusMap: true });
            return;
        }

    });
    document.addEventListener('scroll', (event) => {
        const row = event.target instanceof Element ? event.target.closest('[data-landing-scroll]') : null;
        if (!row) return;
        updateLandingScrollButtons(row);
        loadMoreLandingSectionPhotos(row);
    }, true);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && state.isExplorePhotoScopeMenuOpen) {
            setExplorePhotoScopeMenuOpen(false);
            return;
        }
        const activeModal = $$('.modal.is-open').at(-1);
        if (event.key === 'Escape' && activeModal) {
            event.preventDefault();
            if (activeModal.id === 'photo-fullscreen-modal') {
                returnToPhotoDetailFromFullscreen();
            } else {
                closeModals();
            }
            return;
        }
        if (event.key === 'Tab' && activeModal) {
            const focusableElements = getModalFocusableElements(activeModal);
            if (!focusableElements.length) {
                event.preventDefault();
                return;
            }
            const first = focusableElements[0];
            const last = focusableElements.at(-1);
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
            return;
        }
        if (!['Enter', ' '].includes(event.key) || !(event.target instanceof Element)) return;
        const homePhotoDetailButton = event.target.closest('[data-home-photo-detail]');
        if (homePhotoDetailButton) {
            event.preventDefault();
            openHomeReferencePhotoDetail(homePhotoDetailButton);
            return;
        }
        if (event.target.closest('[data-toggle-photo-like]')) return;
        const photoFullscreenButton = event.target.closest('[data-open-photo-fullscreen]');
        if (photoFullscreenButton) {
            event.preventDefault();
            openPhotoFullscreenFromDetail();
            return;
        }
        const discoveryPhotoButton = event.target.closest('[data-explore-discovery-photo]');
        if (discoveryPhotoButton) {
            const photo = state.exploreMarkerPhotos.find((candidate) => candidate.id === discoveryPhotoButton.dataset.exploreDiscoveryPhoto)
                || getExplorePhotoMapItems().find((candidate) => candidate.id === discoveryPhotoButton.dataset.exploreDiscoveryPhoto);
            if (!photo) return;
            event.preventDefault();
            openExplorePhotoPreview(photo, { focusMap: true });
            return;
        }
        const albumRow = event.target.closest('[data-myphoto-album-id], [data-myphoto-album-name], [data-myphoto-album-draft]');
        if (!albumRow) return;
        event.preventDefault();
        openMyphotoAlbum(albumRow);
    });
    $('#btn-close-pin-preview')?.addEventListener('click', () => clearExplorePinSelection({ restoreMapCenter: true }));
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
    $('#btn-open-profile')?.addEventListener('click', (event) => {
        event.stopPropagation();
        setAccountMenuOpen(!state.isAccountMenuOpen);
    });
    $('#btn-open-notifications')?.addEventListener('click', toggleAccountNotifications);
    $('#btn-open-auth')?.addEventListener('click', () => {
        openModal('#auth-modal');
    });
    $('#account-profile-edit')?.addEventListener('click', () => setAccountProfileEditMode(true));
    $('#account-profile-cancel')?.addEventListener('click', () => setAccountProfileEditMode(false));
    $('#account-profile-form')?.addEventListener('submit', saveAccountProfile);
    $('#profile-avatar-input')?.addEventListener('change', handleAccountProfileAvatarChange);
    $('#account-deletion-open')?.addEventListener('click', openAccountDeletionDialog);
    $('#account-deletion-confirmation')?.addEventListener('input', () => syncAccountDeletionControl());
    $('#account-deletion-form')?.addEventListener('submit', handleAccountDeletionSubmit);
    $('#auth-form')?.addEventListener('submit', handleAuthSubmit);
    $('#btn-email-start')?.addEventListener('click', showEmailAuthForm);
    $('#btn-signup')?.addEventListener('click', () => setAuthMode('signup'));
    $('#btn-switch-login')?.addEventListener('click', () => setAuthMode('login'));
    $('#btn-reset-password')?.addEventListener('click', handlePasswordReset);
    $('#password-recovery-form')?.addEventListener('submit', handlePasswordRecoverySubmit);
    $('#btn-google-login')?.addEventListener('click', () => handleSocialLogin('google'));
    $('#btn-kakao-login')?.addEventListener('click', () => handleSocialLogin('kakao'));
    $('#btn-apply-kakao-profile')?.addEventListener('click', applyPendingKakaoProfile);
    $$('[data-kakao-profile-dismiss]').forEach((button) => {
        button.addEventListener('click', dismissPendingKakaoProfileImport);
    });
    $('#explore-map-search')?.addEventListener('submit', searchExploreMap);
    $('#btn-pick-photo-location')?.addEventListener('click', startLocationEditorMapPick);
    $('#location-editor-form')?.addEventListener('submit', saveManualLocation);
    $('#pin-preview-edit-form')?.addEventListener('submit', saveExplorePreviewEdits);
    $$('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModals));
    $$('.modal').forEach((modal) => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeModals();
        });
    });
    window.addEventListener('hashchange', () => applyRouteHash(window.location.hash));
    window.addEventListener('resize', () => layoutTripReviewPhotoRows());
    document.addEventListener('visibilitychange', () => {
        setLandingHeroSlideshowActive(document.body.dataset.page === LANDING_ROUTE && !document.hidden);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const restoredAuthContext = restorePendingAuthContext(window.localStorage, state);
        if (restoredAuthContext?.visibility) state.visibility = restoredAuthContext.visibility;
        if (restoredAuthContext?.albumId) state.selectedPublicAlbumId = restoredAuthContext.albumId;
        const sharedAlbumId = parseSharedAlbumId(window.location.hash);
        if (sharedAlbumId) state.selectedPublicAlbumId = sharedAlbumId;
        const requestedInitialRoute = parseRouteHash(window.location.hash);
        if (!restoredAuthContext?.route && requestedInitialRoute === APP_SECTIONS.EXPLORE) {
            applyRouteHash(window.location.hash);
        }
        state.currentUser = await getCurrentUser();
        await ensureCurrentUserPublicProfile();
        updateAccountUI();
        if (state.currentUser?.id && requestedInitialRoute === APP_SECTIONS.EXPLORE) {
            state.explorePhotoScope = 'mine';
            state.exploreInitializedUserId = state.currentUser.id;
        }
        bindEvents();
        if (restoredAuthContext?.route) routeTo(restoredAuthContext.route, { replace: !window.location.hash });
        else applyRouteHash(window.location.hash, { replace: !window.location.hash });
        await loadSavedLibrary();
        await loadLandingCuration();
        await loadPublicProfileNames();
        ensureProfileHeaderShell();
        showPendingKakaoProfileImport();
        renderStagedPhotos();
        renderSavedPhotoSurfaces();
        renderTravelDraftSurfaces();
        renderExploreList();
        setVisibilityMode(state.visibility);
        setProfileTab(state.profileTab);
        if (state.currentUser) await runPendingAuthAction();
        if (isPasswordRecoveryCallback(initialAuthHash)) {
            openModal('#password-recovery-modal');
            $('#new-password-input')?.focus();
        }
    } finally {
        setAppBooting(false);
    }
});
