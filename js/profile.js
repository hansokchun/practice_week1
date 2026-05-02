/**
 * profile.js — 유저 프로필 페이지, 앨범 관리, 갤러리 렌더링
 */
import { upsertPhoto, updateUserMetadata } from '../auth.js';
import { activatePanel } from './state.js';

export function initProfile({ state, ui, map }, { showDetail, renderAll, showToast, syncData }) {

    function openProfilePage(userId, nickname) {
        state.profileReturnTo = ui.panelDetail.classList.contains('active') ? 'detail' : 'explore';
        state.profileReturnToPhoto = state.currentPhoto;
        state.viewMode = 'user';
        state.targetUserId = userId;
        state.currentPhoto = null;
        // 프로필 진입 시 항상 사진 탭이 먼저 보이도록 초기화
        state.profileViewMode = 'photos';
        state.activeAlbum = null;
        if (state.currentMarker) { map.removeLayer(state.currentMarker); state.currentMarker = null; }

        const photoPool = (state.currentUser && userId === state.currentUser.id) ? state.photos : state.sharedPhotos;
        const userPhotos = photoPool.filter(p => p.owner_id === userId);
        const totalLikes = userPhotos.reduce((sum, p) => sum + (p.liked || 0), 0);

        if (ui.profilePageNickname) ui.profilePageNickname.textContent = nickname;
        if (ui.profilePageStoryCount) ui.profilePageStoryCount.textContent = userPhotos.length;
        if (ui.profilePageLikeCount) ui.profilePageLikeCount.textContent = totalLikes;

        // 아바타
        if (ui.profilePageAvatar) {
            let avatarToUse = null;
            if (state.currentUser && userId === state.currentUser.id) {
                avatarToUse = state.currentUser.user_metadata?.avatar_url;
            }
            if (avatarToUse) {
                ui.profilePageAvatar.innerHTML = `<img src="${avatarToUse}" alt="avatar">`;
                ui.profilePageAvatar.style.background = 'none';
            } else {
                const initial = nickname.charAt(0).toUpperCase();
                ui.profilePageAvatar.innerHTML = `<span style="font-size: 32px; font-weight: bold; color: white;">${initial}</span>`;
                ui.profilePageAvatar.style.background = 'var(--primary-color)';
            }
            ui.profilePageAvatar.style.display = 'flex';
            ui.profilePageAvatar.style.alignItems = 'center';
            ui.profilePageAvatar.style.justifyContent = 'center';
        }

        // 갤러리 렌더링
        const renderGallery = () => {
            if (!ui.profileGalleryGrid) return;
            ui.profileGalleryGrid.innerHTML = '';
            if (ui.profileGalleryHeader) ui.profileGalleryHeader.innerHTML = '';
            
            let sortedPhotos = [...userPhotos];
            if (state.profileSortMode === 'likes') {
                sortedPhotos.sort((a, b) => (b.liked || 0) - (a.liked || 0) || b.date.localeCompare(a.date));
            } else {
                sortedPhotos.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
            }

            if (state.profileViewMode === 'albums') {
                // 사진 선택 모드 (앨범에 사진 추가)
                if (state.isSelectingPhotos) {
                    if (ui.profileGallerySort) ui.profileGallerySort.style.display = 'none';
                    
                    const headerItem = document.createElement('div');
                    headerItem.style.cssText = 'padding:16px; background:#f8fafc; border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; gap:10px;';
                    headerItem.innerHTML = `
                        <button id="btn-cancel-select" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:14px; font-weight:600; flex-shrink:0; padding:8px;">취소</button>
                        <div style="flex:1;"></div>
                        <button id="btn-save-select" style="background-color:var(--primary-color); color:white; border:none; border-radius:12px; padding:6px 12px; font-size:13px; font-weight:600; cursor:pointer; flex-shrink:0;">저장</button>
                    `;
                    (ui.profileGalleryHeader || ui.profileGalleryGrid).appendChild(headerItem);
                    
                    document.getElementById('btn-cancel-select').onclick = () => {
                        state.isSelectingPhotos = false;
                        state.selectedPhotosForAlbum = [];
                        renderGallery();
                    };

                    document.getElementById('btn-save-select').onclick = async () => {
                        document.getElementById('btn-save-select').textContent = '저장 중...';
                        for (const p of userPhotos) {
                            if (state.selectedPhotosForAlbum.includes(p.id)) {
                                p.album = state.activeAlbum;
                                await upsertPhoto(p);
                            }
                        }
                        state.isSelectingPhotos = false;
                        state.selectedPhotosForAlbum = [];
                        renderGallery();
                    };
                    
                    sortedPhotos.forEach(p => {
                        const item = document.createElement('div');
                        item.className = 'profile-gallery-item';
                        const isSelected = state.selectedPhotosForAlbum.includes(p.id);
                        item.style.cssText = `position:relative; border:${isSelected ? '3px solid var(--primary-color)' : 'none'}; box-sizing:border-box;`;
                        item.innerHTML = `
                            <img src="${p.url ? p.url.replace('_detail.jpg', '_thumb.jpg') : ''}" loading="lazy" alt="photo" onerror="this.src='${p.url}'" style="opacity:${isSelected ? 0.7 : 1}; transition:opacity 0.2s;" />
                            ${isSelected ? '<div class="select-checkmark" style="position:absolute; top:5px; right:5px; background:var(--primary-color); color:white; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-weight:bold; z-index:2;">✓</div>' : ''}
                        `;
                        item.onclick = () => {
                            const sel = state.selectedPhotosForAlbum.includes(p.id);
                            if (sel) {
                                state.selectedPhotosForAlbum = state.selectedPhotosForAlbum.filter(id => id !== p.id);
                            } else {
                                state.selectedPhotosForAlbum.push(p.id);
                            }
                            renderGallery();
                        };
                        ui.profileGalleryGrid.appendChild(item);
                    });
                    return;
                }

                // 앨범 그룹화 — 자기 프로필 vs 타인 프로필 분기
                const isOwnProfile = state.currentUser && userId === state.currentUser.id;
                const albumGroups = {};

                if (isOwnProfile) {
                    // 내 프로필: customAlbums 목록 기반으로 빈 앨범도 표시
                    const customAlbums = state.currentUser?.user_metadata?.customAlbums || [];
                    customAlbums.forEach(name => { albumGroups[name] = []; });
                }
                // 사진을 앨범으로 그룹화
                sortedPhotos.forEach(p => {
                    const albumName = p.album ? p.album.trim() : '';
                    if (albumName) {
                        if (!albumGroups[albumName]) albumGroups[albumName] = [];
                        albumGroups[albumName].push(p);
                    }
                });
                
                if (ui.profileGallerySort) ui.profileGallerySort.style.display = 'none';

                if (state.activeAlbum) {
                    // 앨범 내부 사진 표시
                    const albumPhotos = albumGroups[state.activeAlbum] || [];
                    const isAlbumShared = albumPhotos.length > 0 && albumPhotos.every(p => p.shared);
                    const headerItem = document.createElement('div');
                    headerItem.style.cssText = 'padding:16px; background:#f8fafc; border-bottom:1px solid var(--border-color); display:flex; align-items:center; gap:10px;';
                    
                    if (isOwnProfile) {
                        // 소유자: 뒤로, 추가, 공유 버튼
                        headerItem.innerHTML = `
                            <div style="display:flex; justify-content:space-between; width:100%; align-items:center; flex-wrap:nowrap;">
                                <div style="display:flex; align-items:center; min-width:0;">
                                    <button id="btn-back-to-albums" style="background:none; border:none; color:var(--primary-color); cursor:pointer; font-size:14px; font-weight:600; flex-shrink:0; padding:0; margin-right:8px;">← 뒤로</button>
                                    <span style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${state.activeAlbum}</span>
                                    <span style="color:var(--text-muted); font-size:12px; margin-left:4px; flex-shrink:0;">(${albumPhotos.length})</span>
                                </div>
                                <div style="display:flex; gap:6px; flex-shrink:0; margin-left:8px;">
                                    <button id="btn-share-album" style="background-color:${isAlbumShared ? '#10b981' : '#6b7280'}; color:white; border:none; border-radius:12px; padding:6px 12px; font-size:13px; font-weight:600; cursor:pointer;">${isAlbumShared ? '공유 중' : '공유'}</button>
                                    <button id="btn-add-photos-to-album" style="background-color:var(--primary-color); color:white; border:none; border-radius:12px; padding:6px 12px; font-size:13px; font-weight:600; cursor:pointer;">+ 추가</button>
                                </div>
                            </div>
                        `;
                    } else {
                        // 방문자: 뒤로 버튼만
                        headerItem.innerHTML = `
                            <div style="display:flex; align-items:center; min-width:0;">
                                <button id="btn-back-to-albums" style="background:none; border:none; color:var(--primary-color); cursor:pointer; font-size:14px; font-weight:600; flex-shrink:0; padding:0; margin-right:8px;">← 뒤로</button>
                                <span style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${state.activeAlbum}</span>
                                <span style="color:var(--text-muted); font-size:12px; margin-left:4px; flex-shrink:0;">(${albumPhotos.length})</span>
                            </div>
                        `;
                    }
                    (ui.profileGalleryHeader || ui.profileGalleryGrid).appendChild(headerItem);
                    
                    document.getElementById('btn-back-to-albums').onclick = () => {
                        state.activeAlbum = null;
                        renderGallery();
                        renderAll();
                    };

                    // 소유자 전용: 사진 추가 버튼
                    if (isOwnProfile) {
                        const btnAdd = document.getElementById('btn-add-photos-to-album');
                        if (btnAdd) {
                            btnAdd.onclick = () => {
                                state.isSelectingPhotos = true;
                                state.selectedPhotosForAlbum = [];
                                renderGallery();
                            };
                        }

                        // 앨범 공유 토글: 앨범 내 모든 사진의 shared 상태를 일괄 변경
                        const btnShare = document.getElementById('btn-share-album');
                        if (btnShare) {
                            btnShare.onclick = async () => {
                                const newShared = !isAlbumShared;
                                btnShare.textContent = '처리 중...';
                                btnShare.disabled = true;
                                for (const p of albumPhotos) {
                                    p.shared = newShared;
                                    await upsertPhoto(p);
                                }
                                showToast(newShared ? '앨범이 공유되었습니다.' : '앨범 공유가 해제되었습니다.', 'success');
                                // 데이터 동기화 후 현재 앨범 페이지에서 그대로 유지
                                await syncData();
                                renderGallery();
                                renderAll();
                            };
                        }
                    }
                    
                    // 사진 목록
                    albumPhotos.forEach(p => {
                        const item = document.createElement('div');
                        item.className = 'profile-gallery-item';
                        item.style.position = 'relative';

                        if (isOwnProfile) {
                            // 소유자: 앨범 제거 버튼 포함
                            item.innerHTML = `
                                <img src="${p.url ? p.url.replace('_detail.jpg', '_thumb.jpg') : ''}" loading="lazy" alt="photo" onerror="this.src='${p.url}'" />
                                <button class="btn-remove-from-album" title="앨범에서 제거" style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.6); color:white; border:none; border-radius:50%; width:24px; height:24px; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s;">✕</button>
                            `;
                            item.onmouseenter = () => { item.querySelector('.btn-remove-from-album').style.opacity = '1'; };
                            item.onmouseleave = () => { item.querySelector('.btn-remove-from-album').style.opacity = '0'; };
                            item.querySelector('img').onclick = () => showDetail(p);
                            item.querySelector('.btn-remove-from-album').onclick = async (e) => {
                                e.stopPropagation();
                                p.album = null;
                                await upsertPhoto(p);
                                showToast('앨범에서 제거되었습니다.', 'info');
                                await syncData();
                                renderGallery();
                                renderAll();
                            };
                        } else {
                            // 방문자: 읽기 전용
                            item.innerHTML = `<img src="${p.url ? p.url.replace('_detail.jpg', '_thumb.jpg') : ''}" loading="lazy" alt="photo" onerror="this.src='${p.url}'" />`;
                            item.onclick = () => showDetail(p);
                        }
                        ui.profileGalleryGrid.appendChild(item);
                    });
                } else {
                    // 앨범 폴더 목록
                    for (const [albumName, photos] of Object.entries(albumGroups)) {
                        // 타인 프로필: 빈 앨범은 표시하지 않음
                        if (!isOwnProfile && photos.length === 0) continue;

                        const coverPhoto = photos.length > 0 ? photos[0] : null;
                        const item = document.createElement('div');
                        item.className = 'profile-album-folder';
                        item.style.position = 'relative';
                        item.innerHTML = `
                            ${coverPhoto ? `<img src="${coverPhoto.url ? coverPhoto.url.replace('_detail.jpg', '_thumb.jpg') : ''}" loading="lazy" alt="album cover" onerror="this.src='${coverPhoto.url}'" />` : '<div style="width:100%; height:100%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; color:var(--text-muted);">빈 앨범</div>'}
                            <div class="album-info" style="padding-top: ${coverPhoto ? '20px' : '10px'};">
                                <div class="album-title" style="color: ${coverPhoto ? 'white' : 'var(--text-main)'};">${albumName}</div>
                                <div class="album-count" style="color: ${coverPhoto ? 'white' : 'var(--text-muted)'};">${photos.length} 사진</div>
                            </div>
                            ${isOwnProfile ? `<button class="btn-delete-album-folder" title="앨범 삭제" style="position:absolute; top:6px; right:6px; background:rgba(0,0,0,0.5); color:white; border:none; border-radius:50%; width:26px; height:26px; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s; z-index:2;">✕</button>` : ''}
                        `;
                        if (isOwnProfile) {
                            item.onmouseenter = () => { const b = item.querySelector('.btn-delete-album-folder'); if(b) b.style.opacity = '1'; };
                            item.onmouseleave = () => { const b = item.querySelector('.btn-delete-album-folder'); if(b) b.style.opacity = '0'; };
                        }
                        // 앨범 클릭 → 앨범 내부로 진입
                        const openAlbum = () => {
                            state.activeAlbum = albumName;
                            renderGallery();
                            renderAll();
                        };
                        item.querySelector('.album-info').onclick = openAlbum;
                        if (coverPhoto) item.querySelector('img').onclick = openAlbum;

                        // 소유자 전용: 앨범 삭제
                        if (isOwnProfile) {
                            const delBtn = item.querySelector('.btn-delete-album-folder');
                            if (delBtn) {
                                delBtn.onclick = async (e) => {
                                    e.stopPropagation();
                                    if (!confirm(`"${albumName}" 앨범을 삭제하시겠습니까?\n(사진은 삭제되지 않고 앨범에서만 해제됩니다.)`)) return;
                                    for (const p of photos) { p.album = null; await upsertPhoto(p); }
                                    const currentCustomAlbums = state.currentUser?.user_metadata?.customAlbums || [];
                                    const newCustomAlbums = currentCustomAlbums.filter(a => a !== albumName);
                                    const { user, error } = await updateUserMetadata({ customAlbums: newCustomAlbums });
                                    if (!error) state.currentUser.user_metadata = user.user_metadata;
                                    showToast(`"${albumName}" 앨범이 삭제되었습니다.`, 'info');
                                    await syncData();
                                    renderGallery();
                                };
                            }
                        }
                        ui.profileGalleryGrid.appendChild(item);
                    }

                    // 소유자 전용: "새 앨범 만들기" 버튼
                    if (isOwnProfile) {
                        const createItem = document.createElement('div');
                        createItem.className = 'profile-album-folder';
                        createItem.style.cssText = 'background:#f8fafc; border:2px dashed var(--border-color); display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--text-muted); cursor:pointer;';
                        createItem.innerHTML = `<div style="font-size:32px; margin-bottom:8px;">+</div><div style="font-size:14px; font-weight:600;">새 앨범 만들기</div>`;
                        createItem.onclick = async () => {
                            const newName = prompt('새 앨범 이름을 입력하세요:');
                            if (newName && newName.trim()) {
                                const trimmedName = newName.trim();
                                const currentCustomAlbums = state.currentUser?.user_metadata?.customAlbums || [];
                                if (!currentCustomAlbums.includes(trimmedName)) {
                                    const { user, error } = await updateUserMetadata({ customAlbums: [...currentCustomAlbums, trimmedName] });
                                    if (!error) { state.currentUser.user_metadata = user.user_metadata; renderGallery(); }
                                    else alert('앨범 생성 중 오류가 발생했습니다.');
                                }
                            }
                        };
                        ui.profileGalleryGrid.appendChild(createItem);
                    }
                }
            } else {
                // 전체 사진 보기
                if (ui.profileGallerySort) ui.profileGallerySort.style.display = 'block';
                sortedPhotos.forEach(p => {
                    const item = document.createElement('div');
                    item.className = 'profile-gallery-item';
                    item.innerHTML = `<img src="${p.url ? p.url.replace('_detail.jpg', '_thumb.jpg') : ''}" loading="lazy" alt="photo" onerror="this.src='${p.url}'" />`;
                    item.onclick = () => showDetail(p);
                    ui.profileGalleryGrid.appendChild(item);
                });
            }
        };

        renderGallery();

        // 사진/앨범 탭 전환
        if (ui.btnViewPhotos && ui.btnViewAlbums) {
            ui.btnViewPhotos.onclick = () => {
                state.profileViewMode = 'photos';
                state.activeAlbum = null;
                ui.btnViewPhotos.classList.add('active');
                ui.btnViewPhotos.style.cssText += 'background:white; color:var(--text-main); box-shadow:0 1px 3px rgba(0,0,0,0.1);';
                ui.btnViewAlbums.classList.remove('active');
                ui.btnViewAlbums.style.cssText += 'background:transparent; color:var(--text-muted); box-shadow:none;';
                renderGallery();
                renderAll();
            };
            ui.btnViewAlbums.onclick = () => {
                state.profileViewMode = 'albums';
                state.activeAlbum = null;
                ui.btnViewAlbums.classList.add('active');
                ui.btnViewAlbums.style.cssText += 'background:white; color:var(--text-main); box-shadow:0 1px 3px rgba(0,0,0,0.1);';
                ui.btnViewPhotos.classList.remove('active');
                ui.btnViewPhotos.style.cssText += 'background:transparent; color:var(--text-muted); box-shadow:none;';
                renderGallery();
                renderAll();
            };
        }

        if (ui.profileGallerySort) {
            ui.profileGallerySort.value = state.profileSortMode;
            ui.profileGallerySort.onchange = (e) => { state.profileSortMode = e.target.value; renderGallery(); };
        }

        // 패널 전환 — 모든 패널 비활성화 후 profile만 활성화
        ui.sidebar.classList.remove('hidden');
        ui.sidebar.classList.add('expanded');
        activatePanel(ui, 'profile');
        renderAll();
    }

    // 뒤로가기 버튼
    if (ui.btnBackProfileFeed) {
        ui.btnBackProfileFeed.onclick = () => {
            state.viewMode = 'shared';
            state.targetUserId = null;
            activatePanel(ui, 'explore');  // 먼저 모든 패널 비활성화
            if (state.profileReturnTo === 'detail' && state.profileReturnToPhoto) {
                showDetail(state.profileReturnToPhoto);
            } else {
                ui.sidebar.classList.remove('expanded');
                renderAll();
            }
        };
    }

    // 전역 접근 가능하게 (auth-guard에서 참조)
    window.openProfilePage = openProfilePage;

    return { openProfilePage };
}
