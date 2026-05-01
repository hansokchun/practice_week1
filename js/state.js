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
        currentMarker: null
    };
}

/** 자주 참조하는 DOM 요소를 한 번만 캐싱 */
export function createUI() {
    return {
        sidebar: document.getElementById('sidebar'),
        toggleBtn: document.getElementById('sidebar-toggle'),
        grid: document.getElementById('grid-container'),
        dateChips: document.getElementById('date-chips'),
        
        panelExplore: document.getElementById('panel-explore'),
        panelDetail: document.getElementById('panel-detail'),

        // 피드 전환 버튼
        btnMyFeed: document.getElementById('btn-my-feed'),
        btnSharedFeed: document.getElementById('btn-shared-feed'),
        btnFilterLiked: document.getElementById('filter-liked'),
        uploadInput: document.getElementById('upload-input'),
        searchInput: document.getElementById('search-input'),
        communitySort: document.getElementById('community-sort'),
        btnGridDensity: document.getElementById('btn-grid-density'),
        
        // 유저 프로필 패널
        panelUserProfile: document.getElementById('panel-user-profile'),
        btnBackProfileFeed: document.getElementById('btn-back-profile-feed'),
        profilePageAvatar: document.getElementById('profile-page-avatar'),
        profilePageNickname: document.getElementById('profile-page-nickname'),
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
        detailImg: document.getElementById('detail-image'),
        detailDate: document.getElementById('detail-date'),
        detailCoordinates: document.querySelector('#detail-coordinates span'),
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
