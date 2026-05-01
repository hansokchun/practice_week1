/**
 * events.js — §6 이벤트 핸들러 바인딩 (좋아요, 공유, 삭제, 저장, 드래그&드롭 등)
 */
import { upsertPhoto, deletePhoto, toggleLikePhoto, insertLike, deleteLike } from '../auth.js';
import { refreshMapSize } from './map.js';

export function initEvents({ state, ui, map, clusterGroup }, { renderAll, showDetail, closeDetail, showToast, syncData, processFiles, startLocationPicker }) {

    // 사이드바 토글
    function minimizeSidebar() {
        ui.sidebar.classList.add('hidden');
        ui.toggleBtn.textContent = '▶';
        refreshMapSize(map);
    }
    function restoreSidebar() {
        ui.sidebar.classList.remove('hidden');
        ui.toggleBtn.textContent = '◀';
        refreshMapSize(map);
    }

    ui.toggleBtn.onclick = () => {
        if (ui.sidebar.classList.contains('hidden')) restoreSidebar();
        else minimizeSidebar();
    };

    // 지도 클릭 시 사이드바 축소/닫기
    map.on('click', () => {
        if (ui.sidebar.classList.contains('expanded')) closeDetail();
        else if (!ui.sidebar.classList.contains('hidden')) minimizeSidebar();
    });

    // 피드 전환
    ui.btnMyFeed.onclick = () => { state.viewMode = 'my'; state.showOnlyLiked = false; renderAll(); };
    ui.btnSharedFeed.onclick = () => { state.viewMode = 'shared'; state.showOnlyLiked = false; renderAll(); };
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
        state.currentPhoto.shared = !state.currentPhoto.shared;
        const { error } = await upsertPhoto(state.currentPhoto);
        if (error) { state.currentPhoto.shared = !state.currentPhoto.shared; showToast("Share failed", "warning"); return; }
        ui.detailShareBtn.classList.toggle('active', state.currentPhoto.shared);
        showToast(state.currentPhoto.shared ? "Shared to Community" : "Removed from Community", "success");
        syncData();
    };

    // 파일 업로드
    ui.uploadInput.onchange = (e) => {
        if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
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
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files);
    });

    // 스트리트 뷰 닫기
    if (ui.btnCloseStreetView) {
        ui.btnCloseStreetView.onclick = () => { ui.streetViewOverlay.classList.add('hidden'); };
    }
}
