import { APP_SECTIONS } from './app-sections.mjs';
import { createPageStateSnapshot, normalizeSavedPageState } from './page-state.mjs';

export { createPageStateSnapshot, normalizeSavedPageState } from './page-state.mjs';

/**
 * state.js — 앱 전역 상태 객체와 UI DOM 참조를 생성
 * 왜 분리: state와 ui는 모든 모듈이 공유하는 핵심 데이터이므로
 * 한 곳에서 정의하고 import하면 일관성이 보장됨
 */

/** 앱 전역 상태 객체 생성 */
export function createState(currentUser) {
    return {
        photos: [],
        sharedPhotos: [],
        myLikedIds: [],
        appSection: APP_SECTIONS.HOME,
        viewMode: 'my',           // 'my' | 'shared'
        showOnlyLiked: false,
        activeDate: 'all',
        currentPhoto: null,
        isPickingEditLocation: false,
        searchQuery: '',
        isDenseGrid: false,
        communitySortMode: 'latest',
        currentUser: currentUser,
        targetUserId: null,
        detailReturnTo: 'explore',
        profileReturnTo: 'explore',
        profileReturnToPhoto: null,
        profileSortMode: 'latest',
        profileViewMode: 'photos', // 'photos' | 'albums'
        activeAlbum: null,
        routePolyline: null,
        // 현재 포커스된 마커 (상세 보기 시 단독 표시용)
        currentMarker: null,
        // 위치 지정 직후 이벤트 충돌 방지 플래그
        // 왜 필요: map.js와 events.js의 클릭 핸들러가 같은 클릭에서 연쇄 실행되는 것을 방지
        _justPickedLocation: false
    };
}

/** 자주 참조하는 DOM 요소를 한 번만 캐싱 */
export function createUI() {
    return {
        sidebar: document.getElementById('sidebar'),
        toggleBtn: document.getElementById('sidebar-toggle'),
        grid: document.getElementById('grid-container'),
        dateChips: document.getElementById('date-chips'),
        appShell: document.getElementById('app-shell'),
        appNav: document.getElementById('app-nav'),
        navHome: document.getElementById('nav-home'),
        navMyphoto: document.getElementById('nav-myphoto'),
        navExplore: document.getElementById('nav-explore'),
        panelHome: document.getElementById('panel-home'),
        btnHomeStart: document.getElementById('btn-home-start'),
        btnHomeExplore: document.getElementById('btn-home-explore'),
        
        panelExplore: document.getElementById('panel-explore'),
        panelUpload: document.getElementById('panel-upload'),
        panelDetail: document.getElementById('panel-detail'),
        panelShareSettings: document.getElementById('panel-share-settings'),
        panelAlbumReview: document.getElementById('panel-album-review'),
        panelPublicTrip: document.getElementById('panel-public-trip'),

        // 피드 전환 버튼
        btnMyFeed: document.getElementById('btn-my-feed'),
        btnSharedFeed: document.getElementById('btn-shared-feed'),
        btnFilterLiked: document.getElementById('filter-liked'),
        btnOpenUpload: document.getElementById('btn-open-upload'),
        btnUploadBack: document.getElementById('btn-upload-back'),
        btnUploadChoose: document.getElementById('btn-upload-choose'),
        uploadStartState: document.getElementById('upload-start-state'),
        uploadCompleteState: document.getElementById('upload-complete-state'),
        uploadCompleteCopy: document.getElementById('upload-complete-copy'),
        uploadCompleteGrid: document.getElementById('upload-complete-grid'),
        uploadResultTotal: document.getElementById('upload-result-total'),
        uploadResultSuccess: document.getElementById('upload-result-success'),
        uploadResultLocation: document.getElementById('upload-result-location'),
        uploadResultErrors: document.getElementById('upload-result-errors'),
        btnUploadReviewMap: document.getElementById('btn-upload-review-map'),
        btnUploadAnother: document.getElementById('btn-upload-another'),
        uploadInput: document.getElementById('upload-input'),
        searchInput: document.getElementById('search-input'),
        communitySort: document.getElementById('community-sort'),
        btnGridDensity: document.getElementById('btn-grid-density'),
        reviewSummaryVisible: document.getElementById('review-summary-visible'),
        reviewSummaryMapped: document.getElementById('review-summary-mapped'),
        reviewSummaryPublic: document.getElementById('review-summary-public'),
        
        // 유저 프로필 패널
        panelUserProfile: document.getElementById('panel-user-profile'),
        btnBackProfileFeed: document.getElementById('btn-back-profile-feed'),
        profilePageTitle: document.getElementById('profile-page-title'),
        profilePageAvatar: document.getElementById('profile-page-avatar'),
        profilePageNickname: document.getElementById('profile-page-nickname'),
        profilePageSubtitle: document.getElementById('profile-page-subtitle'),
        profilePageStoryCount: document.getElementById('profile-page-story-count'),
        profilePageLikeCount: document.getElementById('profile-page-like-count'),
        profileGalleryHeader: document.getElementById('profile-gallery-header'),
        profileGalleryGrid: document.getElementById('profile-gallery-grid'),
        profileGallerySort: document.getElementById('profile-gallery-sort'),
        btnViewPhotos: document.getElementById('btn-view-photos'),
        btnViewAlbums: document.getElementById('btn-view-albums'),

        // 상세 패널 UI
        btnBack: document.getElementById('btn-back'),
        btnDelete: document.getElementById('btn-delete'),
        btnEditLocation: document.getElementById('btn-edit-location'),
        btnPickLocation: document.getElementById('btn-pick-location'),
        btnCopyLink: document.getElementById('btn-copy-link'),
        btnCopyLocation: document.getElementById('btn-copy-location'),
        detailImg: document.getElementById('detail-image'),
        detailDate: document.getElementById('detail-date'),
        detailCoordinates: document.querySelector('#detail-coordinates span'),
        selectedPinTitle: document.getElementById('selected-pin-title'),
        selectedPinMeta: document.getElementById('selected-pin-meta'),
        detailTitleText: document.getElementById('detail-title-text'),
        detailAlbumBadge: document.getElementById('detail-album-badge'),
        editTitleInput: document.getElementById('edit-title-input'),
        editDateInput: document.getElementById('edit-date-input'),
        editTimeInput: document.getElementById('edit-time-input'),
        editLatInput: document.getElementById('edit-lat-input'),
        editLngInput: document.getElementById('edit-lng-input'),
        authorName: document.getElementById('author-name'),
        viewModeContainer: document.getElementById('view-mode-container'),
        editModeContainer: document.getElementById('edit-mode-container'),
        btnToggleEdit: document.getElementById('btn-toggle-edit'),
        btnCancelEdit: document.getElementById('btn-cancel-edit'),
        detailLikeBtn: document.getElementById('detail-like-btn'),
        detailShareBtn: document.getElementById('detail-share-btn'),
        btnShareSettingsBack: document.getElementById('btn-share-settings-back'),
        shareSettingsStatus: document.getElementById('share-settings-status'),
        btnSharePrivate: document.getElementById('btn-share-private'),
        btnSharePublic: document.getElementById('btn-share-public'),
        btnAlbumReviewBack: document.getElementById('btn-album-review-back'),
        albumReviewTitle: document.getElementById('album-review-title'),
        albumReviewCopy: document.getElementById('album-review-copy'),
        albumReviewName: document.getElementById('album-review-name'),
        albumReviewCount: document.getElementById('album-review-count'),
        albumReviewStatus: document.getElementById('album-review-status'),
        albumReviewMapStatus: document.getElementById('album-review-map-status'),
        albumReviewTripStatus: document.getElementById('album-review-trip-status'),
        btnAlbumReviewAdd: document.getElementById('btn-album-review-add'),
        btnAlbumReviewOpen: document.getElementById('btn-album-review-open'),
        btnAlbumReviewTrip: document.getElementById('btn-album-review-trip'),
        btnPublicTripBack: document.getElementById('btn-public-trip-back'),
        publicTripTitle: document.getElementById('public-trip-title'),
        publicTripCopy: document.getElementById('public-trip-copy'),
        publicTripCount: document.getElementById('public-trip-count'),
        publicTripPlaces: document.getElementById('public-trip-places'),
        publicTripRange: document.getElementById('public-trip-range'),
        publicTripStatus: document.getElementById('public-trip-status'),
        publicTripRoute: document.getElementById('public-trip-route'),
        publicTripGrid: document.getElementById('public-trip-grid'),
        btnSaveEdit: document.getElementById('btn-save-edit'),
        likeCountBadge: document.getElementById('like-count-badge'),

        // 댓글
        commentsList: document.getElementById('comments-list'),
        commentInput: document.getElementById('comment-input'),
        btnSendComment: document.getElementById('btn-send-comment'),

        // 스트리트 뷰
        streetViewOverlay: document.getElementById('street-view-overlay'),
        streetViewFrame: document.getElementById('street-view-frame'),
        btnCloseStreetView: document.getElementById('btn-close-street-view')
    };
}

/**
 * 모든 사이드바 패널을 비활성화 (겹침 방지)
 * 왜 필요: 패널 전환 시 이전 패널을 확실히 숨기지 않으면
 * 두 패널이 동시에 active 상태가 되어 겹쳐 보이는 버그 발생
 */
export function deactivateAllPanels(ui) {
    if (ui.panelHome) ui.panelHome.classList.remove('active');
    ui.panelExplore.classList.remove('active');
    if (ui.panelUpload) ui.panelUpload.classList.remove('active');
    ui.panelDetail.classList.remove('active');
    if (ui.panelShareSettings) ui.panelShareSettings.classList.remove('active');
    if (ui.panelAlbumReview) ui.panelAlbumReview.classList.remove('active');
    if (ui.panelPublicTrip) ui.panelPublicTrip.classList.remove('active');
    if (ui.panelUserProfile) ui.panelUserProfile.classList.remove('active');
}

/**
 * 지정된 패널만 활성화 (다른 패널은 모두 비활성화됨)
 * @param {'home' | 'explore' | 'upload' | 'detail' | 'share' | 'albumReview' | 'publicTrip' | 'profile'} panelName
 */
export function activatePanel(ui, panelName) {
    deactivateAllPanels(ui);
    switch (panelName) {
        case 'home': if (ui.panelHome) ui.panelHome.classList.add('active'); break;
        case 'explore': ui.panelExplore.classList.add('active'); break;
        case 'upload': if (ui.panelUpload) ui.panelUpload.classList.add('active'); break;
        case 'detail':  ui.panelDetail.classList.add('active'); break;
        case 'share': if (ui.panelShareSettings) ui.panelShareSettings.classList.add('active'); break;
        case 'albumReview': if (ui.panelAlbumReview) ui.panelAlbumReview.classList.add('active'); break;
        case 'publicTrip': if (ui.panelPublicTrip) ui.panelPublicTrip.classList.add('active'); break;
        case 'profile': if (ui.panelUserProfile) ui.panelUserProfile.classList.add('active'); break;
    }
}

// ─── 페이지 상태 저장/복원 (새로고침 시 현재 페이지 유지) ───

const PAGE_STATE_KEY = 'travelgram_page_state';

/**
 * 현재 페이지 상태를 sessionStorage에 저장
 * 왜 sessionStorage: 탭을 닫으면 자동 삭제됨 (localStorage와 달리 영구 보관 안 함)
 */
export function savePageState(state) {
    const snapshot = createPageStateSnapshot(state);
    try {
        sessionStorage.setItem(PAGE_STATE_KEY, JSON.stringify(snapshot));
    } catch (e) {
        // sessionStorage 불가 환경 (시크릿 모드 등) 대비 무시
    }
}

/**
 * sessionStorage에서 저장된 페이지 상태를 읽어옴
 * @returns {object|null} 저장된 스냅샷 또는 null
 */
export function loadPageState() {
    try {
        const raw = sessionStorage.getItem(PAGE_STATE_KEY);
        return raw ? normalizeSavedPageState(JSON.parse(raw)) : null;
    } catch (e) {
        return null;
    }
}

