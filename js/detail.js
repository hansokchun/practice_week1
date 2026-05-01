/**
 * detail.js — 사진 상세 보기, 댓글 로드/작성, closeDetail
 */
import { fetchComments, postComment } from '../auth.js';
import { refreshMapSize } from './map.js';
import { activatePanel } from './state.js';

export function initDetail({ state, ui, map, clusterGroup }, { renderAll, showToast, syncData, openProfilePage }) {

    async function showDetail(p) {
        state.detailReturnTo = (ui.panelUserProfile && ui.panelUserProfile.classList.contains('active')) ? 'profile' : 'explore';
        state.currentPhoto = p;

        // 모든 클러스터 마커 숨기고 이 사진만 단독 마커로 표시
        map.removeLayer(clusterGroup);
        if (state.currentMarker) map.removeLayer(state.currentMarker);
        
        const microUrl = p.url ? p.url.replace('_detail.jpg', '_micro.jpg') : '';
        const pinImg = microUrl || p.url;
        const photoIcon = L.divIcon({
            className: `map-photo-pin active`,
            html: `<div class="pin-img-wrapper" style="border-color: var(--accent-color); transform: scale(1.1);"><img src="${pinImg}" alt="pin"/></div>`,
            iconSize: [36, 36], iconAnchor: [18, 36]
        });
        state.currentMarker = L.marker([p.lat, p.lng], { icon: photoIcon }).addTo(map);

        ui.detailImg.src = p.url;
        
        // 촬영 시점 표시
        ui.detailDate.textContent = p.date 
            ? `찍은 시점: ${p.date.replace('T', ' ')}` 
            : '찍은 시점: 정보 없음';

        // 좌표 표시
        ui.detailCoordinates.textContent = (p.lat && p.lng)
            ? `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`
            : '위치 정보 없음';

        const isMyPhoto = state.currentUser && p.owner_id === state.currentUser.id;
        
        // 작성자 이름 및 클릭 이벤트
        const authorNameText = isMyPhoto ? (state.currentUser.user_metadata?.nickname || '나') : 'User ' + p.owner_id.substring(0,4);
        ui.authorName.textContent = authorNameText;
        ui.authorName.onclick = () => openProfilePage(p.owner_id, authorNameText);

        // 설명 표시
        if (p.description) {
            ui.detailTitleText.textContent = p.description;
            ui.detailTitleText.style.display = 'block';
        } else {
            ui.detailTitleText.textContent = '';
            ui.detailTitleText.style.display = 'none';
        }

        // 앨범 배지 표시
        if (p.album) {
            ui.detailAlbumBadge.textContent = p.album;
            ui.detailAlbumBadge.style.display = 'inline-block';
        } else {
            ui.detailAlbumBadge.textContent = '';
            ui.detailAlbumBadge.style.display = 'none';
        }

        // 수정 폼 초기값
        ui.editTitleInput.value = p.description || '';
        if (p.date) {
            const dateStr = p.date.replace('T', ' ');
            const parts = dateStr.split(' ');
            ui.editDateInput.value = parts[0] || '';
            ui.editTimeInput.value = parts[1] ? parts[1].substring(0, 5) : '';
        } else {
            ui.editDateInput.value = '';
            ui.editTimeInput.value = '';
        }
        ui.editLatInput.value = p.lat || '';
        ui.editLngInput.value = p.lng || '';
        ui.likeCountBadge.textContent = `${p.liked || 0} likes`;
        
        const isLikedByMe = state.myLikedIds.includes(p.id.toString());

        // UI 권한 분기
        ui.btnDelete.style.display = isMyPhoto ? 'flex' : 'none';
        ui.detailShareBtn.style.display = isMyPhoto ? 'flex' : 'none';
        
        // View 모드로 초기화
        ui.viewModeContainer.classList.remove('hidden');
        ui.editModeContainer.classList.add('hidden');
        ui.btnToggleEdit.style.display = isMyPhoto ? 'inline-block' : 'none';
        ui.btnEditLocation.style.display = 'none';

        ui.btnToggleEdit.onclick = () => {
            ui.viewModeContainer.classList.add('hidden');
            ui.editModeContainer.classList.remove('hidden');
            ui.btnEditLocation.style.display = 'flex';
            ui.editTitleInput.focus();
            state.isPickingEditLocation = false;
        };

        if (ui.btnPickLocation) {
            ui.btnPickLocation.onclick = (e) => {
                e.stopPropagation();
                state.isPickingEditLocation = true;
                ui.sidebar.classList.remove('expanded');
                ui.sidebar.classList.add('hidden');
                document.body.classList.add('picking-location');
                const guideThumb = document.getElementById('guide-thumb');
                if (guideThumb && state.currentPhoto) guideThumb.src = state.currentPhoto._dataUrl || state.currentPhoto.url;
                setTimeout(() => refreshMapSize(map), 300);
                showToast("지도화면에서 새로운 위치를 클릭하여 지정해주세요.", "info");
            };
        }

        ui.btnCancelEdit.onclick = () => {
            ui.viewModeContainer.classList.remove('hidden');
            ui.editModeContainer.classList.add('hidden');
            ui.btnEditLocation.style.display = 'none';
            ui.editTitleInput.value = p.description || '';
            if (p.date) {
                const dateStr = p.date.replace('T', ' ');
                const parts = dateStr.split(' ');
                ui.editDateInput.value = parts[0] || '';
                ui.editTimeInput.value = parts[1] ? parts[1].substring(0, 5) : '';
            } else {
                ui.editDateInput.value = '';
                ui.editTimeInput.value = '';
            }
            ui.editLatInput.value = p.lat || '';
            ui.editLngInput.value = p.lng || '';
            
            if (state.isPickingEditLocation) {
                state.isPickingEditLocation = false;
                document.body.classList.remove('picking-location');
                ui.sidebar.classList.remove('hidden');
                if (window.innerWidth <= 768) ui.sidebar.classList.add('expanded');
                setTimeout(() => refreshMapSize(map), 300);
            }
        };

        ui.detailLikeBtn.classList.toggle('active', isLikedByMe);
        ui.detailShareBtn.classList.toggle('active', !!p.shared);

        // 패널 전환 — 모든 패널을 먼저 비활성화 후 detail만 활성화
        ui.sidebar.classList.remove('hidden');
        ui.sidebar.classList.add('expanded');
        activatePanel(ui, 'detail');
        ui.toggleBtn.textContent = '◀';
        
        map.setView([p.lat, p.lng], 14);
        refreshMapSize(map);
        window.history.replaceState(null, null, `#${p.id}`);
        loadComments(p.id);
    }

    async function loadComments(photoId) {
        if (!photoId) return;
        ui.commentsList.innerHTML = '<p style="font-size:12px; color:var(--text-muted)">Loading comments...</p>';
        try {
            const { data, error } = await fetchComments(photoId);
            if (error) throw error;
            ui.commentsList.innerHTML = '';
            if (data.length === 0) {
                ui.commentsList.innerHTML = '<p style="font-size:12px; color:var(--text-muted); padding: 10px;">No comments yet. Be the first!</p>';
            } else {
                data.forEach(c => {
                    const el = document.createElement('div');
                    el.className = 'comment-item';
                    const nickname = (state.currentUser && c.author_id === state.currentUser.id) 
                        ? (state.currentUser.user_metadata?.nickname || '나') 
                        : ('User ' + c.author_id.substring(0,4));
                    const authorSpan = document.createElement('div');
                    authorSpan.className = 'clickable-author';
                    authorSpan.style.cssText = "font-weight: 600; font-size: 13px; color: var(--primary-color); margin-bottom: 4px; display: inline-block;";
                    authorSpan.textContent = nickname;
                    authorSpan.onclick = () => openProfilePage(c.author_id, nickname);
                    const contentDiv = document.createElement('div');
                    contentDiv.innerHTML = `<div>${c.text}</div><span class="comment-date">${new Date(c.date).toLocaleString()}</span>`;
                    el.appendChild(authorSpan);
                    el.appendChild(contentDiv);
                    ui.commentsList.appendChild(el);
                });
            }
        } catch (e) {
            console.error("Comment Load Error:", e);
            ui.commentsList.innerHTML = '<p style="font-size:12px; color:var(--danger-color); padding: 10px;">Failed to load comments.</p>';
        }
    }

    const handlePostComment = async () => {
        if (!state.currentUser) { showToast("로그인이 필요합니다.", "warning"); return; }
        const text = ui.commentInput.value.trim();
        if (!text || !state.currentPhoto) return;
        const photoId = state.currentPhoto.id.toString();
        const originalText = ui.btnSendComment.textContent;
        ui.btnSendComment.textContent = '...';
        ui.btnSendComment.disabled = true;
        try {
            const { error } = await postComment(photoId, text, state.currentUser.id);
            if (error) throw error;
            ui.commentInput.value = '';
            await loadComments(photoId);
            showToast("Comment posted!", "success");
        } catch (e) {
            showToast(`Error: ${e.message}`, "warning");
        } finally {
            ui.btnSendComment.textContent = originalText;
            ui.btnSendComment.disabled = false;
        }
    };

    ui.btnSendComment.onclick = handlePostComment;
    ui.commentInput.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(); }
    };

    function closeDetail() {
        ui.panelDetail.classList.remove('active');
        state.currentPhoto = null;
        if (state.detailReturnTo === 'profile') {
            ui.sidebar.classList.add('expanded');
            activatePanel(ui, 'profile');
        } else {
            ui.sidebar.classList.remove('expanded');
            activatePanel(ui, 'explore');
        }
        if (state.currentMarker) { map.removeLayer(state.currentMarker); state.currentMarker = null; }
        map.addLayer(clusterGroup);
        refreshMapSize(map);
        window.history.replaceState(null, null, window.location.pathname);
    }

    return { showDetail, closeDetail, loadComments };
}
