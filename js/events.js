/**
 * events.js — §6 이벤트 핸들러 바인딩 (좋아요, 공유, 삭제, 저장, 드래그&드롭 등)
 */
import { upsertPhoto, deletePhoto, toggleLikePhoto, insertLike, deleteLike } from '../auth.js';
import { APP_SECTIONS, getViewModeForSection, normalizeAppSection, sectionToHash } from './app-sections.mjs';
import { formatGoogleMapsLocation } from './location-copy.mjs';
import { refreshMapSize } from './map.js';
import { activatePanel, savePageState } from './state.js';

export function initEvents({ state, ui, map, clusterGroup }, { renderAll, showDetail, closeDetail, showToast, syncData, processFiles, startLocationPicker }) {

    // 사이드바 토글
    function minimizeSidebar() {
        ui.sidebar.classList.add('hidden');
        ui.toggleBtn.textContent = '▶';
        refreshMapSize(map);
    }
    function restoreSidebar() {
        ui.sidebar.classList.remove('hidden');
        // 상세 페이지나 프로필 페이지가 활성이면 expanded 상태도 복원
        // (이 패널들은 큰 사이드바가 필요하므로)
        const needsExpanded = ui.panelDetail.classList.contains('active') 
            || (ui.panelUserProfile && ui.panelUserProfile.classList.contains('active'));
        if (needsExpanded) {
            ui.sidebar.classList.add('expanded');
        }
        ui.toggleBtn.textContent = '◀';
        refreshMapSize(map);
    }

    function setActiveNav(section) {
        const normalized = normalizeAppSection(section);
        if (ui.navHome) ui.navHome.classList.toggle('active', normalized === APP_SECTIONS.HOME);
        if (ui.navMyphoto) ui.navMyphoto.classList.toggle('active', normalized === APP_SECTIONS.MYPHOTO);
        if (ui.navExplore) ui.navExplore.classList.toggle('active', normalized === APP_SECTIONS.EXPLORE);
    }

    function openSection(section, options = {}) {
        const normalized = normalizeAppSection(section);
        state.appSection = normalized;
        state.showOnlyLiked = false;

        if (normalized === APP_SECTIONS.HOME) {
            activatePanel(ui, 'home');
            setActiveNav(normalized);
            state.currentPhoto = null;
            renderAll();
            if (!options.skipHash) window.location.hash = sectionToHash(normalized);
            savePageState(state);
            return;
        }

        state.viewMode = getViewModeForSection(normalized);
        activatePanel(ui, 'explore');
        setActiveNav(normalized);
        renderAll();
        if (!options.skipHash) window.location.hash = sectionToHash(normalized);
        savePageState(state);
    }

    function refreshShareSettings() {
        if (!ui.shareSettingsStatus || !state.currentPhoto) return;
        const isPublic = !!state.currentPhoto.shared;
        ui.shareSettingsStatus.textContent = isPublic ? 'Public in Explore' : 'Private in Myphoto';
        if (ui.btnSharePrivate) ui.btnSharePrivate.classList.toggle('active', !isPublic);
        if (ui.btnSharePublic) ui.btnSharePublic.classList.toggle('active', isPublic);
    }

    async function setCurrentPhotoVisibility(shared) {
        if (!state.currentUser) { showToast("로그인이 필요합니다.", "warning"); return; }
        if (!state.currentPhoto) return;
        const previous = !!state.currentPhoto.shared;
        if (previous === shared) {
            refreshShareSettings();
            return;
        }

        state.currentPhoto.shared = shared;
        const { error } = await upsertPhoto(state.currentPhoto);
        if (error) {
            state.currentPhoto.shared = previous;
            refreshShareSettings();
            showToast("Share failed", "warning");
            return;
        }

        if (ui.detailShareBtn) ui.detailShareBtn.classList.toggle('active', shared);
        refreshShareSettings();
        showToast(shared ? "Published to Explore" : "Kept private", "success");
        syncData();
    }

    state.openSection = openSection;

    ui.toggleBtn.onclick = () => {
        if (ui.sidebar.classList.contains('hidden')) restoreSidebar();
        else minimizeSidebar();
    };

    // 지도 클릭 시 사이드바 축소/닫기 (위치 지정 모드 또는 직후에는 무시)
    map.on('click', () => {
        if (state.isPickingEditLocation || state._justPickedLocation) return;
        if (ui.sidebar.classList.contains('expanded')) closeDetail();
        else if (!ui.sidebar.classList.contains('hidden')) minimizeSidebar();
    });

    // 피드 전환
    if (ui.navHome) ui.navHome.onclick = () => openSection(APP_SECTIONS.HOME);
    if (ui.navMyphoto) ui.navMyphoto.onclick = () => openSection(APP_SECTIONS.MYPHOTO);
    if (ui.navExplore) ui.navExplore.onclick = () => openSection(APP_SECTIONS.EXPLORE);
    if (ui.btnHomeStart) ui.btnHomeStart.onclick = () => openSection(APP_SECTIONS.MYPHOTO);
    if (ui.btnHomeExplore) ui.btnHomeExplore.onclick = () => openSection(APP_SECTIONS.EXPLORE);
    if (ui.btnOpenUpload) ui.btnOpenUpload.onclick = () => {
        if (!state.currentUser) { showToast("로그인이 필요합니다.", "warning"); return; }
        state.appSection = APP_SECTIONS.MYPHOTO;
        state.viewMode = 'my';
        setActiveNav(APP_SECTIONS.MYPHOTO);
        if (ui.uploadStartState) ui.uploadStartState.classList.add('active');
        if (ui.uploadCompleteState) ui.uploadCompleteState.classList.remove('active');
        activatePanel(ui, 'upload');
        savePageState(state);
    };
    if (ui.btnUploadBack) ui.btnUploadBack.onclick = () => openSection(APP_SECTIONS.MYPHOTO);
    if (ui.btnUploadChoose) ui.btnUploadChoose.onclick = () => {
        if (!state.currentUser) { showToast("로그인이 필요합니다.", "warning"); return; }
        ui.uploadInput.click();
    };
    if (ui.btnUploadReviewMap) ui.btnUploadReviewMap.onclick = () => openSection(APP_SECTIONS.MYPHOTO);
    if (ui.btnUploadAnother) ui.btnUploadAnother.onclick = () => {
        if (ui.uploadStartState) ui.uploadStartState.classList.add('active');
        if (ui.uploadCompleteState) ui.uploadCompleteState.classList.remove('active');
        ui.uploadInput.click();
    };

    ui.btnMyFeed.onclick = () => openSection(APP_SECTIONS.MYPHOTO);
    ui.btnSharedFeed.onclick = () => openSection(APP_SECTIONS.EXPLORE);
    ui.btnFilterLiked.onclick = () => { state.showOnlyLiked = !state.showOnlyLiked; renderAll(state.activeDate); };

    // 검색
    ui.searchInput.oninput = (e) => { state.searchQuery = e.target.value; renderAll(state.activeDate); };

    // 커뮤니티 정렬
    if (ui.communitySort) {
        ui.communitySort.onchange = (e) => { state.communitySortMode = e.target.value; renderAll(state.activeDate); };
    }

    // 그리드 밀도 토글
    ui.btnGridDensity.onclick = () => { state.isDenseGrid = !state.isDenseGrid; renderAll(state.activeDate); };

    // 날짜 칩 클릭
    ui.dateChips.onclick = (e) => { if (e.target.classList.contains('chip')) renderAll(e.target.dataset.date); };

    // 상세 뒤로가기
    ui.btnBack.onclick = closeDetail;

    // 위치 수정
    ui.btnEditLocation.onclick = () => {
        if (!state.currentPhoto) return;
        showToast("Click on the map to set a new location", "info");
        startLocationPicker([state.currentPhoto]);
    };

    // 저장 (upsert)
    ui.btnSaveEdit.onclick = async () => {
        if (!state.currentPhoto) return;
        state.currentPhoto.description = ui.editTitleInput.value;
        const d = ui.editDateInput.value;
        const t = ui.editTimeInput.value;
        if (d) state.currentPhoto.date = t ? `${d} ${t}:00` : d;
        const latVal = parseFloat(ui.editLatInput.value);
        const lngVal = parseFloat(ui.editLngInput.value);
        if (!isNaN(latVal) && !isNaN(lngVal)) { state.currentPhoto.lat = latVal; state.currentPhoto.lng = lngVal; }

        try {
            const { error } = await upsertPhoto(state.currentPhoto);
            if (error) throw error;
            const btn = ui.btnSaveEdit;
            const originalText = btn.querySelector('span').textContent;
            btn.querySelector('span').textContent = 'Cloud Saved!';
            
            if (state.currentPhoto.description) { ui.detailTitleText.textContent = state.currentPhoto.description; ui.detailTitleText.style.display = 'block'; }
            else { ui.detailTitleText.textContent = ''; ui.detailTitleText.style.display = 'none'; }

            if (state.currentPhoto.album) { ui.detailAlbumBadge.textContent = state.currentPhoto.album; ui.detailAlbumBadge.style.display = 'inline-block'; }
            else { ui.detailAlbumBadge.textContent = ''; ui.detailAlbumBadge.style.display = 'none'; }

            if (state.currentPhoto.lat && state.currentPhoto.lng) {
                ui.detailCoordinates.textContent = `${state.currentPhoto.lat.toFixed(4)}, ${state.currentPhoto.lng.toFixed(4)}`;
            }

            ui.viewModeContainer.classList.remove('hidden');
            ui.editModeContainer.classList.add('hidden');
            ui.btnEditLocation.style.display = 'none';
            setTimeout(() => { btn.querySelector('span').textContent = originalText; }, 2000);
            syncData();
        } catch (e) {
            showToast("Cloud Save Failed", "warning");
        }
    };

    // 삭제
    ui.btnDelete.onclick = async () => {
        if (!state.currentPhoto) return;
        if (!confirm('Are you sure?')) return;
        try {
            const { error } = await deletePhoto(state.currentPhoto.id);
            if (error) throw error;
            closeDetail(); syncData();
            showToast("Deleted from cloud", "info");
        } catch (e) { showToast("Delete Failed", "warning"); }
    };

    // 링크 복사
    ui.btnCopyLink.onclick = () => {
        if (!state.currentPhoto) return;
        const shareUrl = `${window.location.origin}${window.location.pathname}#${state.currentPhoto.id}`;
        navigator.clipboard.writeText(shareUrl)
            .then(() => showToast("Direct link copied!", "success"))
            .catch(() => showToast("Failed to copy link", "warning"));
    };

    if (ui.btnCopyLocation) {
        ui.btnCopyLocation.onclick = () => {
            const locationText = state.currentPhoto
                ? formatGoogleMapsLocation(state.currentPhoto.lat, state.currentPhoto.lng)
                : null;
            if (!locationText) {
                showToast("위치정보가 없습니다.", "warning");
                return;
            }
            navigator.clipboard.writeText(locationText)
                .then(() => showToast("위치 정보가 복사되었습니다.", "success"))
                .catch(() => showToast("위치 정보 복사에 실패했습니다.", "warning"));
        };
    }

    // 좋아요 (서버 동기화)
    ui.detailLikeBtn.onclick = async () => {
        if (!state.currentUser) { showToast("로그인이 필요합니다.", "warning"); return; }
        if (!state.currentPhoto) return;
        const photoId = state.currentPhoto.id.toString();
        const isLiked = state.myLikedIds.includes(photoId);
        
        // 낙관적 UI
        if (isLiked) {
            state.myLikedIds = state.myLikedIds.filter(id => id !== photoId);
            state.currentPhoto.liked = Math.max(0, (state.currentPhoto.liked || 0) - 1);
        } else {
            state.myLikedIds.push(photoId);
            state.currentPhoto.liked = (state.currentPhoto.liked || 0) + 1;
        }
        ui.detailLikeBtn.classList.toggle('active', !isLiked);
        ui.likeCountBadge.textContent = `${state.currentPhoto.liked} likes`;

        const [rpcResult, likeResult] = await Promise.all([
            toggleLikePhoto(photoId, !isLiked),
            isLiked ? deleteLike(state.currentUser.id, photoId) : insertLike(state.currentUser.id, photoId)
        ]);

        if (rpcResult.error || likeResult.error) {
            // 롤백
            if (isLiked) { state.myLikedIds.push(photoId); state.currentPhoto.liked += 1; }
            else { state.myLikedIds = state.myLikedIds.filter(id => id !== photoId); state.currentPhoto.liked = Math.max(0, state.currentPhoto.liked - 1); }
            ui.detailLikeBtn.classList.toggle('active', isLiked);
            ui.likeCountBadge.textContent = `${state.currentPhoto.liked} likes`;
            showToast("좋아요 반영에 실패했습니다.", "warning");
            return;
        }
        renderAll(state.activeDate);
    };

    // 공유 토글
    ui.detailShareBtn.onclick = async () => {
        if (!state.currentUser) { showToast("로그인이 필요합니다.", "warning"); return; }
        if (!state.currentPhoto) return;
        refreshShareSettings();
        activatePanel(ui, 'share');
    };

    if (ui.btnShareSettingsBack) ui.btnShareSettingsBack.onclick = () => activatePanel(ui, 'detail');
    if (ui.btnSharePrivate) ui.btnSharePrivate.onclick = () => setCurrentPhotoVisibility(false);
    if (ui.btnSharePublic) ui.btnSharePublic.onclick = () => setCurrentPhotoVisibility(true);

    // 파일 업로드
    ui.uploadInput.onchange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
        }
        ui.uploadInput.value = '';
    };

    // 드래그 & 드롭
    const dropZone = document.getElementById('drop-zone');
    let dragCounter = 0;
    window.addEventListener('dragenter', (e) => { e.preventDefault(); dragCounter++; dropZone.classList.remove('hidden'); dropZone.classList.add('active'); });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('dragleave', (e) => {
        e.preventDefault(); dragCounter--;
        if (dragCounter === 0) { dropZone.classList.remove('active'); setTimeout(() => { if(dragCounter === 0) dropZone.classList.add('hidden'); }, 300); }
    });
    window.addEventListener('drop', (e) => {
        e.preventDefault(); dragCounter = 0;
        dropZone.classList.remove('active');
        setTimeout(() => dropZone.classList.add('hidden'), 300);
        if (!state.currentUser) { showToast("로그인이 필요합니다.", "warning"); return; }
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            state.appSection = APP_SECTIONS.MYPHOTO;
            state.viewMode = 'my';
            setActiveNav(APP_SECTIONS.MYPHOTO);
            if (ui.uploadStartState) ui.uploadStartState.classList.add('active');
            if (ui.uploadCompleteState) ui.uploadCompleteState.classList.remove('active');
            activatePanel(ui, 'upload');
            processFiles(e.dataTransfer.files);
        }
    });

    // 스트리트 뷰 닫기
    if (ui.btnCloseStreetView) {
        ui.btnCloseStreetView.onclick = () => { ui.streetViewOverlay.classList.add('hidden'); };
    }
}
