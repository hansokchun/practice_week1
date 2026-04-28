document.addEventListener('DOMContentLoaded', async () => {
    // ═══════════════════════════════════════════════════
    // 1. SUPABASE AUTH & SPLASH GUARD
    // ═══════════════════════════════════════════════════
    const currentUser = await getCurrentUser();
    const splash = document.getElementById('splash-screen');
    
    // Get Started 버튼 클릭 시 스플래시 화면 숨김 (로그인 여부 무관하게 앱 진입)
    if (splash) {
        const btnStart = document.getElementById('btn-start');
        if (btnStart) {
            btnStart.onclick = () => {
                splash.style.display = 'none';
            };
        }
    }

    const userMenu = document.getElementById('user-menu');
    const userAvatar = document.getElementById('user-avatar');
    const btnLoginSidebar = document.getElementById('btn-login-sidebar');
    const btnPostLabel = document.getElementById('btn-post-label');
    
    if (!currentUser) {
        // 비로그인 상태: 로그인 버튼 표시, 프로필 및 포스트 버튼 숨김
        if (btnLoginSidebar) btnLoginSidebar.style.display = 'inline-block';
        if (btnPostLabel) btnPostLabel.style.display = 'none';
        if (userMenu) userMenu.style.display = 'none';
    } else {
        // 로그인된 사용자: 스플래시 화면 즉시 숨기고 유저 메뉴 표시
        if (splash) splash.style.display = 'none';
        if (btnLoginSidebar) btnLoginSidebar.style.display = 'none';

    } // end else

    // 유저 UI 적용
    const btnLogout = document.getElementById('btn-logout');
    const profilePopup = document.getElementById('profile-popup');
    
    if (userMenu && userAvatar && currentUser && currentUser.email) {
        userMenu.style.display = 'flex';
        const userInitial = currentUser.email.substring(0, 2).toUpperCase();
        userAvatar.textContent = userInitial;
        
        // 프로필 팝업 정보 채우기
        const profileEmail = document.getElementById('profile-email');
        const profileId = document.getElementById('profile-id');
        const profileNickname = document.getElementById('profile-nickname');
        const profileEmailSub = document.getElementById('profile-email-sub');
        const profileAvatarLg = document.getElementById('profile-popup-avatar');
        
        // 뷰 전환 관련 DOM
        const profileMainView = document.getElementById('profile-main-view');
        const profileDetailView = document.getElementById('profile-detail-view');
        const btnViewInfo = document.getElementById('btn-view-info');
        const btnBackProfile = document.getElementById('btn-back-profile');
        
        // 데모그래픽(상세정보/수정) 관련 DOM
        const demoDisplay = document.getElementById('demo-display');
        const demoEdit = document.getElementById('demo-edit');
        const demoEmail = document.getElementById('demo-email');
        const demoAge = document.getElementById('demo-age');
        const demoGender = document.getElementById('demo-gender');
        const inputNickname = document.getElementById('input-nickname');
        const inputAge = document.getElementById('input-age');
        const inputGender = document.getElementById('input-gender');
        const btnEditDemo = document.getElementById('btn-edit-demo');
        const btnSaveDemo = document.getElementById('btn-save-demo');
        const btnCancelDemo = document.getElementById('btn-cancel-demo');
        const editAvatarPreview = document.getElementById('edit-avatar-preview');
        const inputAvatarFile = document.getElementById('input-avatar-file');
        let selectedAvatarFile = null;

        let nickname = (currentUser.user_metadata && currentUser.user_metadata.nickname) || '';
        let age = (currentUser.user_metadata && currentUser.user_metadata.age) || '';
        let gender = (currentUser.user_metadata && currentUser.user_metadata.gender) || '';
        let avatarUrl = (currentUser.user_metadata && currentUser.user_metadata.avatar_url) || null;

        const renderProfileUI = () => {
            // 메인 뷰 정보
            if (avatarUrl) {
                const imgHtml = `<img src="${avatarUrl}" alt="avatar">`;
                if (profileAvatarLg) profileAvatarLg.innerHTML = imgHtml;
                if (userAvatar) userAvatar.innerHTML = imgHtml;
            } else {
                if (profileAvatarLg) profileAvatarLg.innerHTML = userInitial;
                if (userAvatar) userAvatar.innerHTML = userInitial;
            }
            if (profileNickname) profileNickname.textContent = nickname || currentUser.email;
            if (profileEmailSub) profileEmailSub.textContent = nickname ? currentUser.email : `ID: ${currentUser.id.substring(0, 8)}`;
            
            // 상세 뷰 정보
            if (demoEmail) demoEmail.textContent = currentUser.email;
            
            if (age) { 
                const ageLabel = inputAge ? Array.from(inputAge.options).find(o => o.value === age)?.text || age : age;
                if (demoAge) { demoAge.textContent = ageLabel; demoAge.style.color = 'var(--text-main)'; }
            } else { 
                if (demoAge) { demoAge.textContent = '미입력'; demoAge.style.color = 'var(--text-muted)'; }
            }
            
            if (gender) { 
                const genderLabel = inputGender ? Array.from(inputGender.options).find(o => o.value === gender)?.text || gender : gender;
                if (demoGender) { demoGender.textContent = genderLabel; demoGender.style.color = 'var(--text-main)'; }
            } else { 
                if (demoGender) { demoGender.textContent = '미입력'; demoGender.style.color = 'var(--text-muted)'; }
            }
            
            if (demoDisplay && demoEdit) {
                demoDisplay.classList.remove('hidden');
                demoEdit.classList.add('hidden');
            }
        };
        renderProfileUI();

        // 뷰 전환 이벤트
        if (btnViewInfo) {
            btnViewInfo.onclick = (e) => {
                e.stopPropagation();
                if (profileMainView) profileMainView.classList.add('hidden');
                if (profileDetailView) profileDetailView.classList.remove('hidden');
                renderProfileUI();
            };
        }

        if (btnBackProfile) {
            btnBackProfile.onclick = (e) => {
                e.stopPropagation();
                if (profileDetailView) profileDetailView.classList.add('hidden');
                if (profileMainView) profileMainView.classList.remove('hidden');
            };
        }

        if (btnEditDemo) {
            btnEditDemo.onclick = (e) => {
                e.stopPropagation();
                if (demoDisplay) demoDisplay.classList.add('hidden');
                if (demoEdit) demoEdit.classList.remove('hidden');
                if (inputNickname) inputNickname.value = nickname;
                if (inputAge) inputAge.value = age;
                if (inputGender) inputGender.value = gender;
                
                selectedAvatarFile = null;
                if (editAvatarPreview) {
                    if (avatarUrl) {
                        editAvatarPreview.innerHTML = `<img src="${avatarUrl}" alt="avatar">`;
                    } else {
                        editAvatarPreview.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">클릭하여 변경</span>`;
                    }
                }
            };
        }

        if (editAvatarPreview && inputAvatarFile) {
            editAvatarPreview.onclick = (e) => {
                e.stopPropagation();
                inputAvatarFile.click();
            };
            inputAvatarFile.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    selectedAvatarFile = file;
                    const reader = new FileReader();
                    reader.onload = (re) => {
                        editAvatarPreview.innerHTML = `<img src="${re.target.result}" alt="preview">`;
                    };
                    reader.readAsDataURL(file);
                }
            };
        }

        if (btnCancelDemo) {
            btnCancelDemo.onclick = (e) => {
                e.stopPropagation();
                renderProfileUI();
            };
        }

        if (btnSaveDemo) {
            btnSaveDemo.onclick = async (e) => {
                e.stopPropagation();
                const newNickname = inputNickname ? inputNickname.value.trim() : '';
                const newAge = inputAge ? inputAge.value : '';
                const newGender = inputGender ? inputGender.value : '';
                
                const originalText = btnSaveDemo.textContent;
                btnSaveDemo.textContent = '...';
                btnSaveDemo.disabled = true;

                let newAvatarUrl = avatarUrl;
                if (selectedAvatarFile) {
                    const ext = selectedAvatarFile.name.split('.').pop();
                    const fileName = `avatars/${currentUser.id}_${Date.now()}.${ext}`;
                    const { url, error: uploadErr } = await uploadImage(selectedAvatarFile, fileName);
                    if (!uploadErr && url) {
                        newAvatarUrl = url;
                    } else {
                        console.error("Avatar upload failed:", uploadErr);
                    }
                }

                const { user, error } = await updateUserMetadata({ 
                    nickname: newNickname, 
                    age: newAge, 
                    gender: newGender,
                    avatar_url: newAvatarUrl
                });
                
                btnSaveDemo.textContent = originalText;
                btnSaveDemo.disabled = false;

                if (error) {
                    console.error('Update failed:', error);
                } else {
                    currentUser.user_metadata = user.user_metadata;
                    nickname = newNickname;
                    age = newAge;
                    gender = newGender;
                    avatarUrl = newAvatarUrl;
                    renderProfileUI();
                }
            };
        }
        
        // 팝업 안에서 클릭시 닫히지 않도록 막기 (select 조작시 등)
        if (profilePopup) {
            profilePopup.onclick = (e) => {
                e.stopPropagation();
            };
        }
        
        // 팝업 토글 이벤트
        userAvatar.style.cursor = 'pointer';
        userAvatar.onclick = (e) => {
            e.stopPropagation();
            if (profilePopup) {
                profilePopup.classList.toggle('hidden');
                
                // 팝업 열릴 때 통계 업데이트
                if (!profilePopup.classList.contains('hidden') && typeof state !== 'undefined') {
                    const profileStoryCount = document.getElementById('profile-story-count');
                    const profileLikeCount = document.getElementById('profile-like-count');
                    
                    const myStories = state.photos.filter(p => p.owner_id === currentUser.id).length;
                    const myLikes = state.myLikedIds.length;
                    
                    if (profileStoryCount) profileStoryCount.textContent = myStories;
                    if (profileLikeCount) profileLikeCount.textContent = myLikes;
                }
            }
        };

        // 외부 클릭시 팝업 닫기
        document.addEventListener('click', (e) => {
            if (profilePopup && !profilePopup.classList.contains('hidden') && !userMenu.contains(e.target)) {
                profilePopup.classList.add('hidden');
            }
        });
        
        if (btnLogout) {
            btnLogout.onclick = async () => {
                await signOut();
                window.location.href = '/login.html';
            };
        }
    }

    // ═══════════════════════════════════════════════════
    // 2. STATE MANAGEMENT
    // ═══════════════════════════════════════════════════
    let state = {
        photos: [],
        sharedPhotos: [],
        myLikedIds: JSON.parse(localStorage.getItem('my_liked_photos') || '[]'),
        viewMode: 'my', // 'my' or 'shared'
        showOnlyLiked: false,
        activeDate: 'all',
        currentPhoto: null,
        searchQuery: '',
        isDenseGrid: false,
        currentUser: currentUser
    };

    // ═══════════════════════════════════════════════════
    // 3. UI REFERENCES
    // ═══════════════════════════════════════════════════
    const ui = {
        sidebar: document.getElementById('sidebar'),
        toggleBtn: document.getElementById('sidebar-toggle'),
        grid: document.getElementById('grid-container'),
        dateChips: document.getElementById('date-chips'),
        
        panelExplore: document.getElementById('panel-explore'),
        panelDetail: document.getElementById('panel-detail'),

        // Buttons
        btnMyFeed: document.getElementById('btn-my-feed'),
        btnSharedFeed: document.getElementById('btn-shared-feed'),
        btnFilterLiked: document.getElementById('filter-liked'),
        uploadInput: document.getElementById('upload-input'),
        searchInput: document.getElementById('search-input'),
        btnGridDensity: document.getElementById('btn-grid-density'),
        
        // User Profile Panel
        panelUserProfile: document.getElementById('panel-user-profile'),
        btnBackProfileFeed: document.getElementById('btn-back-profile-feed'),
        profilePageAvatar: document.getElementById('profile-page-avatar'),
        profilePageNickname: document.getElementById('profile-page-nickname'),
        profilePageStoryCount: document.getElementById('profile-page-story-count'),
        profilePageLikeCount: document.getElementById('profile-page-like-count'),
        profileGalleryGrid: document.getElementById('profile-gallery-grid'),
        profileGallerySort: document.getElementById('profile-gallery-sort'),

        // Detail Panel UI
        btnBack: document.getElementById('btn-back'),
        btnDelete: document.getElementById('btn-delete'),
        btnEditLocation: document.getElementById('btn-edit-location'),
        btnCopyLink: document.getElementById('btn-copy-link'),
        detailImg: document.getElementById('detail-image'),
        detailDate: document.getElementById('detail-date'),
        detailCoordinates: document.querySelector('#detail-coordinates span'),
        detailTitleText: document.getElementById('detail-title-text'),
        editTitleInput: document.getElementById('edit-title-input'),
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

        // Comments
        commentsList: document.getElementById('comments-list'),
        commentInput: document.getElementById('comment-input'),
        btnSendComment: document.getElementById('btn-send-comment'),

        // Street View Overlay
        streetViewOverlay: document.getElementById('street-view-overlay'),
        streetViewFrame: document.getElementById('street-view-frame'),
        btnCloseStreetView: document.getElementById('btn-close-street-view')
    };

    // ═══════════════════════════════════════════════════
    // 4. MAP SETUP
    // ═══════════════════════════════════════════════════
    const map = L.map('map', { 
        zoomControl: false, 
        maxZoom: 19, 
        minZoom: 5 // 축소 한계치 설정 (너무 작게 축소되지 않도록)
    }).setView([36.5, 127.5], 5); // 대한민국, 일본, 중국 일부가 보이는 시점과 줌 레벨

    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko', { 
        attribution: 'Google Maps',
        maxZoom: 19,
        minZoom: 5
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // 맵 마커 아이콘 생성은 renderAll 내부 동적 썸네일 아이콘 로직으로 대체되었음

    const clusterGroup = L.markerClusterGroup({ 
        spiderfyOnMaxZoom: true, 
        showCoverageOnHover: false,
        iconCreateFunction: (c) => L.divIcon({ 
            html: `
                <div class="custom-cluster-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <span class="cluster-count">${c.getChildCount()}</span>
                </div>
            `, 
            className: 'cluster-wrapper', 
            iconSize: [44, 44] 
        })
    });

    // ═══════════════════════════════════════════════════
    // 5. CORE LOGIC — Supabase 직접 통신
    // ═══════════════════════════════════════════════════
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

    // 데이터 동기화: Supabase에서 직접 사진 데이터를 가져옴
    async function syncData() {
        try {
            const { data, error } = await fetchPhotos();
            if (error) throw error;
            
            // 데이터 정규화
            const cloudPhotos = data.map(p => ({ 
                ...p, 
                liked: Number(p.liked || 0), 
                shared: !!p.shared 
            }));
            
            state.photos = cloudPhotos;
            state.sharedPhotos = cloudPhotos.filter(p => p.shared); 
            
            renderAll();

            // 딥 링크 확인 (URL 해시)
            const hashId = window.location.hash.slice(1);
            if (hashId) {
                const linkedPhoto = state.photos.find(p => p.id == hashId);
                if (linkedPhoto) {
                    setTimeout(() => showDetail(linkedPhoto), 500);
                }
            }
        } catch (e) {
            console.error("Sync Error:", e);
            showToast(`Sync Error: ${e.message}`, "warning");
        }
    }

    function renderAll(filterDate = 'all') {
        state.activeDate = filterDate;
        const isMyView = state.viewMode === 'my';
        const isUserView = state.viewMode === 'user';
        
        // 1. 사이드바 메인 그리드용 리스트 (유저 프로필 뷰일때는 메인그리드 필요없지만 혹시 모르니 유지)
        const gridList = (isMyView 
            ? state.photos.filter(p => state.currentUser && p.owner_id === state.currentUser.id) 
            : state.sharedPhotos)
            .filter(p => !state.showOnlyLiked || state.myLikedIds.includes(p.id.toString()))
            .filter(p => filterDate === 'all' || p.date === filterDate)
            .filter(p => !state.searchQuery || (p.description || '').toLowerCase().includes(state.searchQuery.toLowerCase()));

        // 2. 지도 표시용 리스트
        let baseMapList = state.photos.filter(p => {
            const isMyPhoto = state.currentUser && p.owner_id === state.currentUser.id;
            const isShared = !!p.shared;
            return isMyPhoto || isShared;
        });

        if (isUserView) {
            baseMapList = state.sharedPhotos.filter(p => p.owner_id === state.targetUserId);
        }

        const mapList = baseMapList
            .filter(p => !state.showOnlyLiked || state.myLikedIds.includes(p.id.toString()))
            .filter(p => filterDate === 'all' || p.date === filterDate)
            .filter(p => !state.searchQuery || (p.description || '').toLowerCase().includes(state.searchQuery.toLowerCase()));

        // 지도 렌더링
        clusterGroup.clearLayers();
        mapList.forEach(p => {
            const isLikedByMe = state.myLikedIds.includes(p.id.toString());
            
            // 기존 url 이 _detail.jpg 로 끝난다면 교체, 아니라면 그대로 유지
            const microUrl = p.url ? p.url.replace('_detail.jpg', '_micro.jpg') : '';
            const pinImg = microUrl || p.url;
            
            const photoIcon = L.divIcon({
                className: `map-photo-pin ${isLikedByMe ? 'liked' : ''}`,
                html: `<div class="pin-img-wrapper"><img src="${pinImg}" alt="pin"/></div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 40]
            });

            const m = L.marker([p.lat, p.lng], { icon: photoIcon });
            m.on('click', () => {
                showDetail(p);
            });
            clusterGroup.addLayer(m);
        });
        if (!state.currentPhoto) {
            map.addLayer(clusterGroup);
        } else {
            map.removeLayer(clusterGroup);
        }

        // 그리드 렌더링 (날짜 그룹핑 없이 최신순으로 플랫하게)
        gridList.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));

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
                item.onclick = () => { showDetail(p); };
                container.appendChild(item);
            });
            
            ui.grid.appendChild(container);
        }

        ui.btnMyFeed.classList.toggle('active', state.viewMode === 'my');
        ui.btnSharedFeed.classList.toggle('active', state.viewMode === 'shared');
        ui.btnFilterLiked.classList.toggle('active', state.showOnlyLiked);
        
        renderDateChips();
    }

    async function showDetail(p) {
        state.detailReturnTo = (ui.panelUserProfile && ui.panelUserProfile.classList.contains('active')) ? 'profile' : 'explore';
        state.currentPhoto = p;

        // Hide all other markers and show only this one
        map.removeLayer(clusterGroup);
        if (state.currentMarker) {
            map.removeLayer(state.currentMarker);
        }
        
        const microUrl = p.url ? p.url.replace('_detail.jpg', '_micro.jpg') : '';
        const pinImg = microUrl || p.url;
        const photoIcon = L.divIcon({
            className: `map-photo-pin active`,
            html: `<div class="pin-img-wrapper" style="border-color: var(--primary-color); transform: scale(1.1);"><img src="${pinImg}" alt="pin"/></div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });
        state.currentMarker = L.marker([p.lat, p.lng], { icon: photoIcon }).addTo(map);

        ui.detailImg.src = p.url;
        ui.detailDate.textContent = p.date;
        if (p.lat && p.lng) {
            ui.detailCoordinates.textContent = `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;
        } else {
            ui.detailCoordinates.textContent = '위치 정보 없음';
        }
        const isMyPhoto = state.currentUser && p.owner_id === state.currentUser.id;
        
        // 작성자 표시 로직
        const authorNameText = isMyPhoto ? (state.currentUser.user_metadata?.nickname || '나') : 'User ' + p.owner_id.substring(0,4);
        ui.authorName.textContent = authorNameText;
        ui.authorName.onclick = () => {
            openProfilePage(p.owner_id, authorNameText);
        };

        if (p.description) {
            ui.detailTitleText.textContent = p.description;
            ui.detailTitleText.style.display = 'block';
        } else {
            ui.detailTitleText.textContent = '';
            ui.detailTitleText.style.display = 'none';
        }
        ui.editTitleInput.value = p.description || '';
        ui.editLatInput.value = p.lat || '';
        ui.editLngInput.value = p.lng || '';
        ui.likeCountBadge.textContent = `${p.liked || 0} likes`;
        
        const isLikedByMe = state.myLikedIds.includes(p.id.toString());

        // UI 권한 분기
        ui.btnDelete.style.display = isMyPhoto ? 'flex' : 'none';
        ui.detailShareBtn.style.display = isMyPhoto ? 'flex' : 'none';
        
        // 초기 상태: View 모드 (수정 모드 아님)
        ui.viewModeContainer.classList.remove('hidden');
        ui.editModeContainer.classList.add('hidden');
        ui.btnToggleEdit.style.display = isMyPhoto ? 'inline-block' : 'none';
        ui.btnEditLocation.style.display = 'none'; // 수정 모드에서만 보이게 변경할 수도 있지만, 일단 hidden

        ui.btnToggleEdit.onclick = () => {
            ui.viewModeContainer.classList.add('hidden');
            ui.editModeContainer.classList.remove('hidden');
            ui.btnEditLocation.style.display = 'flex'; // 수정 모드일때만 위치변경 버튼 노출
            ui.editTitleInput.focus();
        };

        ui.btnCancelEdit.onclick = () => {
            ui.viewModeContainer.classList.remove('hidden');
            ui.editModeContainer.classList.add('hidden');
            ui.btnEditLocation.style.display = 'none';
            ui.editTitleInput.value = p.description || '';
            ui.editLatInput.value = p.lat || '';
            ui.editLngInput.value = p.lng || '';
        };

        ui.detailLikeBtn.classList.toggle('active', isLikedByMe);
        ui.detailShareBtn.classList.toggle('active', !!p.shared);

        ui.sidebar.classList.remove('hidden');
        ui.sidebar.classList.add('expanded');
        ui.panelExplore.classList.remove('active');
        if (ui.panelUserProfile) ui.panelUserProfile.classList.remove('active');
        ui.panelDetail.classList.add('active');
        ui.toggleBtn.textContent = '◀';
        
        map.setView([p.lat, p.lng], 14);
        refreshMapSize();

        window.history.replaceState(null, null, `#${p.id}`);

        // 댓글 로드
        loadComments(p.id);
    }

    // 댓글 조회: Supabase DB에서 직접
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
                    contentDiv.innerHTML = `
                        <div>${c.text}</div>
                        <span class="comment-date">${new Date(c.date).toLocaleString()}</span>
                    `;
                    
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

    // 댓글 작성: Supabase DB에 직접 삽입
    const handlePostComment = async () => {
        if (!state.currentUser) {
            showToast("로그인이 필요합니다.", "warning");
            return;
        }
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
            console.error(e);
            showToast(`Error: ${e.message}`, "warning");
        } finally {
            ui.btnSendComment.textContent = originalText;
            ui.btnSendComment.disabled = false;
        }
    };

    ui.btnSendComment.onclick = handlePostComment;
    
    ui.commentInput.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handlePostComment();
        }
    };

    function closeDetail() {
        ui.panelDetail.classList.remove('active');
        state.currentPhoto = null;
        
        if (state.detailReturnTo === 'profile') {
            ui.sidebar.classList.add('expanded');
            if (ui.panelUserProfile) ui.panelUserProfile.classList.add('active');
        } else {
            ui.sidebar.classList.remove('expanded');
            ui.panelExplore.classList.add('active');
        }
        
        // Remove the temporary single marker and restore all clusters
        if (state.currentMarker) {
            map.removeLayer(state.currentMarker);
            state.currentMarker = null;
        }
        map.addLayer(clusterGroup);

        refreshMapSize();
        window.history.replaceState(null, null, window.location.pathname);
    }

    function minimizeSidebar() {
        ui.sidebar.classList.add('hidden');
        ui.toggleBtn.textContent = '▶';
        refreshMapSize();
    }

    function restoreSidebar() {
        ui.sidebar.classList.remove('hidden');
        ui.toggleBtn.textContent = '◀';
        refreshMapSize();
    }

    map.on('click', () => {
        if (ui.sidebar.classList.contains('expanded')) closeDetail();
        else if (!ui.sidebar.classList.contains('hidden')) minimizeSidebar();
    });

    function renderDateChips() {
        ui.dateChips.style.display = 'none'; // Hide date chips completely
    }

    // ═══════════════════════════════════════════════════
    // 6. EVENT HANDLERS
    // ═══════════════════════════════════════════════════
    ui.toggleBtn.onclick = () => {
        if (ui.sidebar.classList.contains('hidden')) restoreSidebar();
        else minimizeSidebar();
    };

    function refreshMapSize() {
        const start = performance.now();
        const step = (now) => {
            map.invalidateSize();
            if (now - start < 500) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    window.openProfilePage = (userId, nickname) => {
        state.profileReturnTo = ui.panelDetail.classList.contains('active') ? 'detail' : 'explore';
        state.profileReturnToPhoto = state.currentPhoto;

        state.viewMode = 'user';
        state.targetUserId = userId;

        // Filter user photos
        const userPhotos = state.sharedPhotos.filter(p => p.owner_id === userId);
        const totalLikes = userPhotos.reduce((sum, p) => sum + (p.liked || 0), 0);

        // Update Header
        if (ui.profilePageNickname) ui.profilePageNickname.textContent = nickname;
        if (ui.profilePageStoryCount) ui.profilePageStoryCount.textContent = userPhotos.length;
        if (ui.profilePageLikeCount) ui.profilePageLikeCount.textContent = totalLikes;

        // Generate Avatar
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

        // Render Gallery function
        const renderGallery = () => {
            if (ui.profileGalleryGrid) {
                ui.profileGalleryGrid.innerHTML = '';
                
                let sortedPhotos = [...userPhotos];
                if (state.profileSortMode === 'likes') {
                    sortedPhotos.sort((a, b) => (b.liked || 0) - (a.liked || 0) || b.date.localeCompare(a.date));
                } else {
                    sortedPhotos.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
                }

                sortedPhotos.forEach(p => {
                const item = document.createElement('div');
                item.className = 'profile-gallery-item';
                item.innerHTML = `<img src="${p.url ? p.url.replace('_detail.jpg', '_thumb.jpg') : ''}" loading="lazy" alt="photo" onerror="this.src='${p.url}'" />`;
                item.onclick = () => {
                    showDetail(p);
                };
                ui.profileGalleryGrid.appendChild(item);
            });
        }
        };

        renderGallery();

        if (ui.profileGallerySort) {
            ui.profileGallerySort.value = state.profileSortMode;
            ui.profileGallerySort.onchange = (e) => {
                state.profileSortMode = e.target.value;
                renderGallery();
            };
        }

        // Switch panels
        ui.sidebar.classList.remove('hidden');
        ui.sidebar.classList.add('expanded');
        ui.panelExplore.classList.remove('active');
        ui.panelDetail.classList.remove('active');
        if (ui.panelUserProfile) ui.panelUserProfile.classList.add('active');

        // Filter Map
        renderAll();
    };

    if (ui.btnBackProfileFeed) {
        ui.btnBackProfileFeed.onclick = () => {
            state.viewMode = 'shared';
            state.targetUserId = null;
            if (ui.panelUserProfile) ui.panelUserProfile.classList.remove('active');
            
            if (state.profileReturnTo === 'detail' && state.profileReturnToPhoto) {
                showDetail(state.profileReturnToPhoto);
            } else {
                ui.sidebar.classList.remove('expanded');
                ui.panelExplore.classList.add('active');
                renderAll();
            }
        };
    }

    ui.btnMyFeed.onclick = () => { state.viewMode = 'my'; state.showOnlyLiked = false; renderAll(); };
    ui.btnSharedFeed.onclick = () => { state.viewMode = 'shared'; state.showOnlyLiked = false; renderAll(); };
    ui.btnFilterLiked.onclick = () => { state.showOnlyLiked = !state.showOnlyLiked; renderAll(state.activeDate); };

    ui.searchInput.oninput = (e) => {
        state.searchQuery = e.target.value;
        renderAll(state.activeDate);
    };

    ui.btnGridDensity.onclick = () => {
        state.isDenseGrid = !state.isDenseGrid;
        renderAll(state.activeDate);
    };

    ui.dateChips.onclick = (e) => {
        if (e.target.classList.contains('chip')) renderAll(e.target.dataset.date);
    };

    ui.btnBack.onclick = closeDetail;

    ui.btnEditLocation.onclick = () => {
        if (!state.currentPhoto) return;
        showToast("Click on the map to set a new location", "info");
        startLocationPicker([state.currentPhoto]);
    };



    // 제목/설명/좌표 저장: Supabase DB에 직접 upsert
    ui.btnSaveEdit.onclick = async () => {
        if (!state.currentPhoto) return;
        state.currentPhoto.description = ui.editTitleInput.value;
        const latVal = parseFloat(ui.editLatInput.value);
        const lngVal = parseFloat(ui.editLngInput.value);
        if (!isNaN(latVal) && !isNaN(lngVal)) {
            state.currentPhoto.lat = latVal;
            state.currentPhoto.lng = lngVal;
        }

        try {
            const { error } = await upsertPhoto(state.currentPhoto);
            if (error) throw error;
            const btn = ui.btnSaveEdit;
            const originalText = btn.querySelector('span').textContent;
            btn.querySelector('span').textContent = 'Cloud Saved!';
            
            // View 모드로 전환
            if (state.currentPhoto.description) {
                ui.detailTitleText.textContent = state.currentPhoto.description;
                ui.detailTitleText.style.display = 'block';
            } else {
                ui.detailTitleText.textContent = '';
                ui.detailTitleText.style.display = 'none';
            }
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

    // 삭제: Supabase DB + Storage에서 직접 삭제
    ui.btnDelete.onclick = async () => {
        if (!state.currentPhoto) return;
        if (!confirm('Are you sure?')) return;
        try {
            const { error } = await deletePhoto(state.currentPhoto.id);
            if (error) throw error;
            closeDetail();
            syncData();
            showToast("Deleted from cloud", "info");
        } catch (e) {
            showToast("Delete Failed", "warning");
        }
    };

    ui.btnCopyLink.onclick = () => {
        if (!state.currentPhoto) return;
        const shareUrl = `${window.location.origin}${window.location.pathname}#${state.currentPhoto.id}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            showToast("Direct link copied!", "success");
        }).catch(() => {
            showToast("Failed to copy link", "warning");
        });
    };

    // 좋아요: Supabase DB에 직접 upsert
    ui.detailLikeBtn.onclick = async () => {
        if (!state.currentUser) {
            showToast("로그인이 필요합니다.", "warning");
            return;
        }
        if (!state.currentPhoto) return;
        const photoId = state.currentPhoto.id.toString();
        const isLiked = state.myLikedIds.includes(photoId);
        
        if (isLiked) {
            state.myLikedIds = state.myLikedIds.filter(id => id !== photoId);
            state.currentPhoto.liked = Math.max(0, (state.currentPhoto.liked || 0) - 1);
        } else {
            state.myLikedIds.push(photoId);
            state.currentPhoto.liked = (state.currentPhoto.liked || 0) + 1;
        }
        localStorage.setItem('my_liked_photos', JSON.stringify(state.myLikedIds));

        const { error } = await toggleLikePhoto(photoId, !isLiked);
        if (error) {
            console.error('Like sync failed (RPC):', error);
            showToast("좋아요 반영 실패! Supabase에서 SQL을 실행했는지 확인해주세요.", "warning");
            // 로컬 상태 롤백
            if (isLiked) {
                state.myLikedIds.push(photoId);
                state.currentPhoto.liked = (state.currentPhoto.liked || 0) + 1;
            } else {
                state.myLikedIds = state.myLikedIds.filter(id => id !== photoId);
                state.currentPhoto.liked = Math.max(0, (state.currentPhoto.liked || 0) - 1);
            }
            localStorage.setItem('my_liked_photos', JSON.stringify(state.myLikedIds));
            ui.detailLikeBtn.classList.toggle('active', isLiked);
            ui.likeCountBadge.textContent = `${state.currentPhoto.liked} likes`;
            return;
        }
        
        ui.detailLikeBtn.classList.toggle('active', !isLiked);
        ui.likeCountBadge.textContent = `${state.currentPhoto.liked} likes`;
        renderAll(state.activeDate);
    };

    // 공유 토글: Supabase DB에 직접 upsert
    ui.detailShareBtn.onclick = async () => {
        if (!state.currentUser) {
            showToast("로그인이 필요합니다.", "warning");
            return;
        }
        if (!state.currentPhoto) return;
        state.currentPhoto.shared = !state.currentPhoto.shared;
        const { error } = await upsertPhoto(state.currentPhoto);
        if (error) {
            state.currentPhoto.shared = !state.currentPhoto.shared; // 롤백
            showToast("Share failed", "warning");
            return;
        }
        ui.detailShareBtn.classList.toggle('active', state.currentPhoto.shared);
        showToast(state.currentPhoto.shared ? "Shared to Community" : "Removed from Community", "success");
        syncData();
    };

    // 사진 업로드: Supabase Storage에 파일 올린 뒤 → DB에 메타데이터 저장
    ui.uploadInput.onchange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
        }
        ui.uploadInput.value = '';
    };

    // --- Drag and Drop Feature ---
    const dropZone = document.getElementById('drop-zone');
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        dropZone.classList.remove('hidden');
        dropZone.classList.add('active');
    });

    window.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    window.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            dropZone.classList.remove('active');
            setTimeout(() => { if(dragCounter === 0) dropZone.classList.add('hidden'); }, 300);
        }
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        dropZone.classList.remove('active');
        setTimeout(() => dropZone.classList.add('hidden'), 300);
        
        if (!state.currentUser) {
            showToast("로그인이 필요합니다.", "warning");
            return;
        }
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    });

    async function processFiles(files) {
        const pendingPhotos = [];
        showToast("Processing photos...", "info");
        
        for (const f of Array.from(files)) {
            // Check if file is an image
            if (!f.type.startsWith('image/')) {
                showToast(`Skipped ${f.name} - Not an image`, "warning");
                continue;
            }

            try {
                const exif = await exifr.parse(f);
                const url = await new Promise(r => { 
                    const rd = new FileReader(); 
                    rd.onload = () => r(rd.result); 
                    rd.readAsDataURL(f); 
                });
                
                const newId = Date.now().toString() + Math.floor(Math.random() * 10000);
                const photoData = { 
                    id: newId,
                    date: (exif?.DateTimeOriginal || new Date()).toISOString().split('T')[0], 
                    title: '', 
                    description: '', 
                    lat: exif?.latitude, 
                    lng: exif?.longitude, 
                    liked: 0, 
                    shared: false,
                    owner_id: state.currentUser.id,
                    _file: f,
                    _dataUrl: url
                };

                if (!photoData.lat || !photoData.lng) {
                    pendingPhotos.push(photoData);
                } else {
                    await uploadAndSavePhoto(photoData);
                }
            } catch (err) { 
                console.error(err); 
                showToast(`Photo processing error: ${err.message}`, "warning");
            }
        }
        
        if (pendingPhotos.length > 0) {
            showToast(`${pendingPhotos.length} photos need location. Click on the map!`, "info");
            startLocationPicker(pendingPhotos);
        } else {
            showToast("Upload complete!", "success");
            syncData();
        }
    }

    /**
     * 이미지 압축 유틸리티 (Canvas 사용)
     */
    async function compressImage(file, maxWidth, quality = 0.8) {
        return new Promise((resolve) => {
            const img = new Image();
            const reader = new FileReader();
            reader.onload = (e) => {
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    }, 'image/jpeg', quality);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    /**
     * 사진을 Storage에 업로드하고 DB에 메타데이터를 저장하는 2단계 함수
     */
    async function uploadAndSavePhoto(photoData) {
        const file = photoData._file || dataUrlToFile(photoData._dataUrl, `${photoData.id}.jpg`);
        
        showToast("Compressing photo (3 versions)...", "info");
        
        // 1단계: 브라우저 내부에서 HTML5 Canvas를 활용하여 3단계 사이즈 압축 병렬 처리
        const [microFile, gridFile, detailFile] = await Promise.all([
            compressImage(file, 100, 0.6),   // 맵 핀 (10KB 내외 목표)
            compressImage(file, 400, 0.7),   // 그리드 피드 (50KB 내외 목표)
            compressImage(file, 1200, 0.8)   // 상세 화면 (300KB 내외 목표)
        ]);
        
        showToast("Uploading chunks to Storage...", "info");
        
        // 2단계: 3장의 사진을 각각 Supabase Storage에 병렬 업로드
        const [microReq, gridReq, detailReq] = await Promise.all([
            uploadImage(microFile, `${photoData.id}_micro.jpg`),
            uploadImage(gridFile, `${photoData.id}_grid.jpg`),
            uploadImage(detailFile, `${photoData.id}_detail.jpg`)
        ]);

        if (microReq.error || gridReq.error || detailReq.error) {
            const uploadError = microReq.error || gridReq.error || detailReq.error;
            showToast(`Upload failed: ${uploadError.message}`, "warning");
            throw uploadError;
        }

        // 3단계: Supabase DB에 메타데이터 저장 (가장 큰 detail 원본의 URL을 메인으로 저장)
        const dbPhoto = {
            id: photoData.id,
            url: detailReq.url,
            date: photoData.date,
            title: photoData.title,
            description: photoData.description,
            lat: photoData.lat,
            lng: photoData.lng,
            liked: photoData.liked,
            shared: photoData.shared,
            owner_id: photoData.owner_id
        };
        
        const { error: dbError } = await upsertPhoto(dbPhoto);
        if (dbError) {
            showToast(`Save failed: ${dbError.message}`, "warning");
            throw dbError;
        }
    }

    function startLocationPicker(list) {
        if (!list.length) { document.body.classList.remove('picking-location'); showToast("Saved!", "success"); syncData(); return; }
        const p = list.shift();
        const guideThumb = document.getElementById('guide-thumb');
        document.body.classList.add('picking-location');
        guideThumb.src = p._dataUrl || p.url;
        clusterGroup.eachLayer(m => m.options.interactive = false);
        map.once('click', async (e) => {
            p.lat = e.latlng.lat; p.lng = e.latlng.lng;
            try {
                await uploadAndSavePhoto(p);
            } catch (err) {
                console.error('Location pick upload failed:', err);
            }
            clusterGroup.eachLayer(m => m.options.interactive = true);
            document.body.classList.remove('picking-location');
            startLocationPicker(list);
        });
    }

    // ═══════════════════════════════════════════════════
    // 7. 앱 초기화 — 데이터 로드
    // ═══════════════════════════════════════════════════
    syncData();

    // ═══════════════════════════════════════════════════
    // 8. MOBILE DRAG HANDLE
    // ═══════════════════════════════════════════════════
    const dragHandle = document.getElementById('drag-handle');
    let isDragging = false;
    let startY = 0;
    let startHeight = 0;

    const onDragStart = (e) => {
        if (window.innerWidth > 768) return;
        isDragging = true;
        startY = e.type === 'mousedown' ? e.pageY : e.touches[0].pageY;
        startHeight = ui.sidebar.getBoundingClientRect().height;
        ui.sidebar.style.transition = 'none';
        ui.sidebar.classList.remove('expanded');
        document.body.style.cursor = 'grabbing';
    };

    const onDragMove = (e) => {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault();
        const currentY = e.type === 'mousemove' ? e.pageY : e.touches[0].pageY;
        const dy = startY - currentY;
        const newHeight = startHeight + dy;
        const minH = window.innerHeight * 0.15;
        const maxH = window.innerHeight;
        if (newHeight >= minH && newHeight <= maxH) {
            ui.sidebar.style.height = `${newHeight}px`;
            refreshMapSize();
        }
    };

    const onDragEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        ui.sidebar.style.transition = '';
        const currentHeight = ui.sidebar.getBoundingClientRect().height;
        const vh = window.innerHeight;
        if (currentHeight > vh * 0.85) {
            ui.sidebar.style.height = '100vh';
            ui.sidebar.classList.add('expanded');
        } else if (currentHeight > vh * 0.35) {
            ui.sidebar.style.height = '60vh';
        } else {
            ui.sidebar.style.height = '15vh';
        }
        refreshMapSize();
    };

    dragHandle.addEventListener('mousedown', onDragStart);
    dragHandle.addEventListener('touchstart', onDragStart, { passive: true });
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('touchmove', onDragMove, { passive: false });
    window.addEventListener('mouseup', onDragEnd);
    window.addEventListener('touchend', onDragEnd);

    // ═══════════════════════════════════════════════════
    // 9. LOGIN MODAL LOGIC
    // ═══════════════════════════════════════════════════
    const loginModal = document.getElementById('login-modal-overlay');
    const btnCloseLogin = document.getElementById('btn-close-login');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const authForm = document.getElementById('auth-form');
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const btnSubmit = document.getElementById('btn-submit');
    const btnGoogle = document.getElementById('btn-google');
    const messageEl = document.getElementById('auth-message');

    let isLoginMode = true;

    if (btnLoginSidebar && loginModal) {
        btnLoginSidebar.onclick = () => {
            loginModal.classList.remove('hidden');
            // Allow display block to apply before adding opacity class
            requestAnimationFrame(() => {
                loginModal.classList.add('active');
            });
        };
    }

    function hideLoginModal() {
        if (!loginModal) return;
        loginModal.classList.remove('active');
        setTimeout(() => {
            loginModal.classList.add('hidden');
        }, 300); // Wait for transition
    }

    if (btnCloseLogin && loginModal) {
        btnCloseLogin.onclick = hideLoginModal;
        
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                hideLoginModal();
            }
        });
    }

    function showAuthMessage(text, type = 'error') {
        if (!messageEl) return;
        messageEl.textContent = text;
        messageEl.className = `auth-message visible ${type}`;
        setTimeout(() => messageEl.classList.remove('visible'), 5000);
    }

    function setAuthLoading(loading) {
        if (!btnSubmit || !btnGoogle) return;
        btnSubmit.disabled = loading;
        btnGoogle.disabled = loading;
        if (loading) {
            btnSubmit.innerHTML = `<span class="spinner"></span>처리 중...`;
        } else {
            btnSubmit.textContent = isLoginMode ? '로그인' : '회원가입';
        }
    }

    if (tabLogin && tabSignup && passwordInput && messageEl && btnSubmit) {
        tabLogin.onclick = () => {
            isLoginMode = true;
            tabLogin.classList.add('active');
            tabSignup.classList.remove('active');
            btnSubmit.textContent = '로그인';
            passwordInput.autocomplete = 'current-password';
            messageEl.classList.remove('visible');
        };

        tabSignup.onclick = () => {
            isLoginMode = false;
            tabSignup.classList.add('active');
            tabLogin.classList.remove('active');
            btnSubmit.textContent = '회원가입';
            passwordInput.autocomplete = 'new-password';
            messageEl.classList.remove('visible');
        };
    }

    if (authForm) {
        authForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email || !password) return showAuthMessage('이메일과 비밀번호를 모두 입력해주세요.');
            if (password.length < 6) return showAuthMessage('비밀번호는 6자 이상이어야 합니다.');

            setAuthLoading(true);

            if (isLoginMode) {
                const { user, error } = await signInWithEmail(email, password);
                if (error) {
                    showAuthMessage(error.message.includes('Invalid login') ? '이메일 또는 비밀번호가 올바르지 않습니다.' : error.message);
                } else {
                    showAuthMessage('로그인 성공! 이동 중...', 'success');
                    setTimeout(() => { window.location.reload(); }, 800);
                }
            } else {
                const { user, error } = await signUpWithEmail(email, password);
                if (error) {
                    showAuthMessage(error.message.includes('already registered') ? '이미 가입된 이메일입니다.' : error.message);
                } else {
                    showAuthMessage('회원가입 완료! 이메일 인증 후 로그인해주세요.', 'success');
                    if (tabLogin) tabLogin.click();
                }
            }
            setAuthLoading(false);
        };
    }

    if (btnGoogle) {
        btnGoogle.onclick = async () => {
            setAuthLoading(true);
            const { error } = await signInWithGoogle();
            if (error) {
                showAuthMessage('구글 로그인에 실패했습니다. 다시 시도해주세요.');
                setAuthLoading(false);
            }
        };
    }

});