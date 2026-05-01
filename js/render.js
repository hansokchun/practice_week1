/**
 * render.js — §5 데이터 동기화, 사이드바 그리드 렌더링, 지도 마커 렌더링
 * 왜 분리: renderAll은 앱의 핵심 렌더링 엔진으로, 다른 모든 모듈에서 호출됨
 */
import { fetchPhotos, fetchMyLikes } from '../auth.js';

/**
 * 렌더링 관련 함수들을 초기화하고 반환
 * @returns {{ showToast, syncData, renderAll, renderDateChips }}
 */
export function initRender({ state, ui, map, clusterGroup }, { showDetail }) {

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    async function syncData() {
        try {
            const { data, error } = await fetchPhotos();
            if (error) throw error;
            
            const cloudPhotos = data.map(p => ({ 
                ...p, liked: Number(p.liked || 0), shared: !!p.shared 
            }));
            
            state.photos = cloudPhotos;
            state.sharedPhotos = cloudPhotos.filter(p => p.shared);

            // 로그인된 유저라면 서버에서 좋아요 목록 동기화
            if (state.currentUser) {
                const { data: likedIds, error: likesError } = await fetchMyLikes(state.currentUser.id);
                if (!likesError) state.myLikedIds = likedIds;
            }
            
            renderAll();

            // 딥 링크 확인 (URL 해시)
            const hashId = window.location.hash.slice(1);
            if (hashId) {
                const linkedPhoto = state.photos.find(p => p.id == hashId);
                if (linkedPhoto) setTimeout(() => showDetail(linkedPhoto), 500);
            }
        } catch (e) {
            console.error("Sync Error:", e);
            showToast(`Sync Error: ${e.message}`, "warning");
        }
    }

    function renderDateChips() {
        ui.dateChips.style.display = 'none';
    }

    function renderAll(filterDate = 'all') {
        state.activeDate = filterDate;
        const isMyView = state.viewMode === 'my';
        const isUserView = state.viewMode === 'user';
        
        // 1. 사이드바 메인 그리드용 리스트
        let gridList = (isMyView 
            ? state.photos.filter(p => state.currentUser && p.owner_id === state.currentUser.id) 
            : state.sharedPhotos)
            .filter(p => !state.showOnlyLiked || state.myLikedIds.includes(p.id.toString()))
            .filter(p => filterDate === 'all' || p.date === filterDate)
            .filter(p => !state.searchQuery || (p.description || '').toLowerCase().includes(state.searchQuery.toLowerCase()));

        // 2. 지도 표시용 리스트
        let baseMapList = state.photos.filter(p => {
            const isMyPhoto = state.currentUser && p.owner_id === state.currentUser.id;
            return isMyPhoto || !!p.shared;
        });

        if (isUserView) {
            // 자기 자신의 프로필이면 공유 여부와 관계없이 전체 사진 표시
            // (앨범 경로 그리기 시 비공유 사진도 포함되어야 하므로)
            const isOwnProfile = state.currentUser && state.targetUserId === state.currentUser.id;
            baseMapList = isOwnProfile 
                ? state.photos.filter(p => p.owner_id === state.targetUserId)
                : state.sharedPhotos.filter(p => p.owner_id === state.targetUserId);
        }

        const mapList = baseMapList
            .filter(p => p.lat && p.lng)
            .filter(p => !state.showOnlyLiked || state.myLikedIds.includes(p.id.toString()))
            .filter(p => filterDate === 'all' || p.date === filterDate)
            .filter(p => !state.searchQuery || (p.description || '').toLowerCase().includes(state.searchQuery.toLowerCase()))
            .filter(p => {
                if (state.profileViewMode === 'albums' && state.activeAlbum) {
                    return (p.album ? p.album.trim() : '') === state.activeAlbum;
                }
                return true;
            });

        // 지도 렌더링
        clusterGroup.clearLayers();
        const bounds = L.latLngBounds();

        mapList.forEach(p => {
            const isLikedByMe = state.myLikedIds.includes(p.id.toString());
            const microUrl = p.url ? p.url.replace('_detail.jpg', '_micro.jpg') : '';
            const pinImg = microUrl || p.url;
            
            const photoIcon = L.divIcon({
                className: `map-photo-pin ${isLikedByMe ? 'liked' : ''}`,
                html: `<div class="pin-img-wrapper"><img src="${pinImg}" alt="pin"/></div>`,
                iconSize: [34, 34], iconAnchor: [17, 34]
            });

            const m = L.marker([p.lat, p.lng], { icon: photoIcon });
            m.on('click', () => showDetail(p));
            clusterGroup.addLayer(m);
            bounds.extend([p.lat, p.lng]);
        });
        
        // 기존 경로선 제거
        if (state.routePolyline) {
            map.removeLayer(state.routePolyline);
            state.routePolyline = null;
        }

        if (!state.currentPhoto) {
            map.addLayer(clusterGroup);
            if (mapList.length > 0 && state.profileViewMode === 'albums' && state.activeAlbum) {
                // 시간순 정렬 후 경로 그리기
                mapList.sort((a, b) => new Date(a.date || a.created_at) - new Date(b.date || b.created_at));
                const latlngs = mapList.map(p => [p.lat, p.lng]);
                if (latlngs.length > 1) {
                    state.routePolyline = L.polyline(latlngs, {
                        color: '#ef4444', weight: 3, dashArray: '8, 8', opacity: 0.8
                    }).addTo(map);
                    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
                } else if (latlngs.length === 1) {
                    // 사진 1장이면 해당 위치로 이동
                    map.setView(latlngs[0], 14);
                }
            }
        } else {
            map.removeLayer(clusterGroup);
        }

        // 그리드 정렬
        if (ui.communitySort) {
            ui.communitySort.classList.toggle('hidden', state.viewMode !== 'shared');
            if (state.viewMode === 'shared') {
                ui.communitySort.value = state.communitySortMode;
                const now = new Date();
                if (state.communitySortMode === 'best_month') {
                    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                    gridList = gridList.filter(p => new Date(p.created_at) >= thirtyDaysAgo);
                    gridList.sort((a, b) => (b.liked || 0) - (a.liked || 0) || b.created_at.localeCompare(a.created_at));
                } else if (state.communitySortMode === 'best_today') {
                    const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
                    gridList = gridList.filter(p => new Date(p.created_at) >= oneDayAgo);
                    gridList.sort((a, b) => (b.liked || 0) - (a.liked || 0) || b.created_at.localeCompare(a.created_at));
                } else {
                    gridList.sort((a, b) => b.created_at.localeCompare(a.created_at));
                }
            } else {
                gridList.sort((a, b) => b.created_at.localeCompare(a.created_at));
            }
        } else {
            gridList.sort((a, b) => b.created_at.localeCompare(a.created_at));
        }

        ui.grid.innerHTML = '';
        ui.grid.classList.toggle('dense', state.isDenseGrid);

        if (gridList.length === 0) {
            ui.grid.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-muted); font-size: 14px;">No stories found.</div>`;
        } else {
            const container = document.createElement('div');
            container.className = 'grid-items-container';
            gridList.forEach(p => {
                const item = document.createElement('div');
                item.className = 'grid-item';
                const gridUrl = p.url ? p.url.replace('_detail.jpg', '_grid.jpg') : '';
                item.innerHTML = `<img src="${gridUrl || p.url}" loading="lazy">`;
                item.onclick = () => showDetail(p);
                container.appendChild(item);
            });
            ui.grid.appendChild(container);
        }

        ui.btnMyFeed.classList.toggle('active', state.viewMode === 'my');
        ui.btnSharedFeed.classList.toggle('active', state.viewMode === 'shared');
        ui.btnFilterLiked.classList.toggle('active', state.showOnlyLiked);
        renderDateChips();
    }

    return { showToast, syncData, renderAll };
}
