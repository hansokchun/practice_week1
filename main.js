document.addEventListener('DOMContentLoaded', async () => {
    // ═══════════════════════════════════════════════════
    // 1. SUPABASE AUTH & SPLASH GUARD
    // ═══════════════════════════════════════════════════
    const currentUser = await getCurrentUser();
    const splash = document.getElementById('splash-screen');
    
    // 로그인되지 않은 사용자: 스플래시 화면만 띄우고 앱 초기화 중단
    if (!currentUser) {
        if (splash) {
            const btnStart = document.getElementById('btn-start');
            if (btnStart) {
                btnStart.onclick = () => {
                    window.location.href = '/login.html';
                };
            }
        }
        return; 
    }

    // 로그인된 사용자: 스플래시 화면 즉시 숨김
    if (splash) splash.style.display = 'none';

    // 유저 UI 적용
    const userMenu = document.getElementById('user-menu');
    const userAvatar = document.getElementById('user-avatar');
    const btnLogout = document.getElementById('btn-logout');
    const profilePopup = document.getElementById('profile-popup');
    
    if (userMenu && userAvatar && currentUser.email) {
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

        let nickname = (currentUser.user_metadata && currentUser.user_metadata.nickname) || '';
        let age = (currentUser.user_metadata && currentUser.user_metadata.age) || '';
        let gender = (currentUser.user_metadata && currentUser.user_metadata.gender) || '';

        const renderProfileUI = () => {
            // 메인 뷰 정보
            if (profileAvatarLg) profileAvatarLg.textContent = userInitial;
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

                const { user, error } = await updateUserMetadata({ nickname: newNickname, age: newAge, gender: newGender });
                
                btnSaveDemo.textContent = originalText;
                btnSaveDemo.disabled = false;

                if (error) {
                    console.error('Update failed:', error);
                } else {
                    currentUser.user_metadata = user.user_metadata;
                    nickname = newNickname;
                    age = newAge;
                    gender = newGender;
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

        // Detail Panel UI
        btnBack: document.getElementById('btn-back'),
        btnDelete: document.getElementById('btn-delete'),
        btnEditLocation: document.getElementById('btn-edit-location'),
        btnStreetView: document.getElementById('btn-street-view'),
        btnCopyLink: document.getElementById('btn-copy-link'),
        detailImg: document.getElementById('detail-image'),
        detailDate: document.getElementById('detail-date'),
        detailDate: document.getElementById('detail-date'),
        editDesc: document.getElementById('edit-desc'),
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
    const map = L.map('map', { zoomControl: false, maxZoom: 19 }).setView([36.2048, 138.2529], 6);
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko', { 
        attribution: 'Google Maps',
        maxZoom: 19
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
        
        // 1. 사이드바 그리드용 리스트
        const gridList = (isMyView 
            ? state.photos.filter(p => p.owner_id === state.currentUser.id) 
            : state.sharedPhotos)
            .filter(p => !state.showOnlyLiked || state.myLikedIds.includes(p.id.toString()))
            .filter(p => filterDate === 'all' || p.date === filterDate)
            .filter(p => !state.searchQuery || (p.description || '').toLowerCase().includes(state.searchQuery.toLowerCase()));

        // 2. 지도 표시용 리스트 (내 사진 + 공유된 모든 사진)
        const mapList = state.photos.filter(p => {
            const isMyPhoto = p.owner_id === state.currentUser.id;
            const isShared = !!p.shared;
            return isMyPhoto || isShared;
        })
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
        map.addLayer(clusterGroup);

        // 그리드 렌더링
        const groups = gridList.reduce((acc, p) => {
            if (!acc[p.date]) acc[p.date] = [];
            acc[p.date].push(p);
            return acc;
        }, {});
        const sortedDates = Object.keys(groups).sort((a,b) => b.localeCompare(a));

        ui.grid.innerHTML = '';
        ui.grid.classList.toggle('dense', state.isDenseGrid);

        if (sortedDates.length === 0) {
            ui.grid.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-muted); font-size: 14px;">No stories found.</div>`;
        } else {
            sortedDates.forEach(date => {
                const groupEl = document.createElement('div');
                groupEl.className = 'grid-group';
                groupEl.innerHTML = `<div class="grid-date-header">${date}</div>`;
                
                const container = document.createElement('div');
                container.className = 'grid-items-container';
                
                groups[date].forEach(p => {
                    const item = document.createElement('div');
                    item.className = 'grid-item';
                    
                    const gridUrl = p.url ? p.url.replace('_detail.jpg', '_grid.jpg') : '';
                    
                    item.innerHTML = `<img src="${gridUrl || p.url}" loading="lazy">`;
                    item.onclick = () => { showDetail(p); };
                    container.appendChild(item);
                });
                
                groupEl.appendChild(container);
                ui.grid.appendChild(groupEl);
            });
        }

        ui.btnMyFeed.classList.toggle('active', state.viewMode === 'my');
        ui.btnSharedFeed.classList.toggle('active', state.viewMode === 'shared');
        ui.btnFilterLiked.classList.toggle('active', state.showOnlyLiked);
        
        renderDateChips();
    }

    async function showDetail(p) {
        state.currentPhoto = p;
        ui.detailImg.src = p.url;
        ui.detailDate.textContent = p.date;
        const isMyPhoto = p.owner_id === state.currentUser.id;
        
        ui.editDesc.value = p.description || '';
        ui.likeCountBadge.textContent = `${p.liked || 0} likes`;
        
        const isLikedByMe = state.myLikedIds.includes(p.id.toString());

        // UI 권한 분기
        ui.btnSaveEdit.style.display = isMyPhoto ? 'flex' : 'none';
        ui.btnDelete.style.display = isMyPhoto ? 'flex' : 'none';
        ui.btnEditLocation.style.display = isMyPhoto ? 'flex' : 'none';
        ui.detailShareBtn.style.display = isMyPhoto ? 'flex' : 'none';
        ui.editDesc.disabled = !isMyPhoto;

        ui.detailLikeBtn.classList.toggle('active', isLikedByMe);
        ui.detailShareBtn.classList.toggle('active', !!p.shared);

        ui.sidebar.classList.remove('hidden');
        ui.sidebar.classList.add('expanded');
        ui.panelExplore.classList.remove('active');
        ui.panelDetail.classList.add('active');
        ui.toggleBtn.textContent = '◀';
        
        map.setView([p.lat, p.lng], 18);
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
                    el.innerHTML = `
                        <div>${c.text}</div>
                        <span class="comment-date">${new Date(c.date).toLocaleString()}</span>
                    `;
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
        ui.sidebar.classList.remove('expanded');
        ui.panelExplore.classList.add('active');
        ui.panelDetail.classList.remove('active');
        state.currentPhoto = null;
        refreshMapSize();
        window.history.replaceState(null, null, window.location.pathname);
    }

    function minimizeSidebar() {
        ui.sidebar.classList.add('hidden');
        ui.sidebar.classList.remove('expanded');
        ui.toggleBtn.textContent = '▶';
        refreshMapSize();
    }

    function restoreSidebar() {
        ui.sidebar.classList.remove('hidden');
        ui.sidebar.classList.remove('expanded');
        ui.toggleBtn.textContent = '◀';
        ui.panelExplore.classList.add('active');
        ui.panelDetail.classList.remove('active');
        refreshMapSize();
    }

    map.on('click', () => {
        if (ui.sidebar.classList.contains('expanded')) closeDetail();
        else if (!ui.sidebar.classList.contains('hidden')) minimizeSidebar();
    });

    function renderDateChips() {
        const isMyView = state.viewMode === 'my';
        const list = isMyView 
            ? state.photos.filter(p => p.owner_id === state.currentUser.id) 
            : state.sharedPhotos;
            
        const dates = [...new Set(list.map(p => p.date))].sort((a,b) => b.localeCompare(a));
        ui.dateChips.innerHTML = `<button class="chip ${state.activeDate === 'all' ? 'active' : ''}" data-date="all">All Dates</button>`;
        dates.forEach(d => {
            const btn = document.createElement('button');
            btn.className = `chip ${state.activeDate === d ? 'active' : ''}`;
            btn.dataset.date = d;
            btn.textContent = d;
            ui.dateChips.appendChild(btn);
        });
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

    ui.btnStreetView.onclick = () => {
        if (!state.currentPhoto) return;
        const { lat, lng } = state.currentPhoto;
        const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
        ui.streetViewFrame.src = streetViewUrl;
        ui.streetViewOverlay.classList.add('active');
    };

    ui.btnCloseStreetView.onclick = () => {
        ui.streetViewOverlay.classList.remove('active');
        ui.streetViewFrame.src = '';
    };

    // 제목/설명 저장: Supabase DB에 직접 upsert
    ui.btnSaveEdit.onclick = async () => {
        if (!state.currentPhoto) return;
        state.currentPhoto.description = ui.editDesc.value;
        try {
            const { error } = await upsertPhoto(state.currentPhoto);
            if (error) throw error;
            const btn = ui.btnSaveEdit;
            const originalText = btn.querySelector('span').textContent;
            btn.querySelector('span').textContent = 'Cloud Saved!';
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
        if (error) console.error('Like sync failed (RPC):', error);
        
        ui.detailLikeBtn.classList.toggle('active', !isLiked);
        ui.likeCountBadge.textContent = `${state.currentPhoto.liked} likes`;
        renderAll(state.activeDate);
    };

    // 공유 토글: Supabase DB에 직접 upsert
    ui.detailShareBtn.onclick = async () => {
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
    ui.uploadInput.onchange = async (e) => {
        const files = e.target.files;
        if (!files.length) return;
        
        const pendingPhotos = [];
        showToast("Processing photos...", "info");
        
        for (const f of Array.from(files)) {
            try {
                const exif = await exifr.parse(f);
                // 원본 파일을 그대로 Supabase Storage에 올릴 것이므로 File 객체 보존
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
                    // 원본 File 객체와 dataUrl을 임시 보관 (업로드 시 사용)
                    _file: f,
                    _dataUrl: url
                };

                if (!photoData.lat || !photoData.lng) {
                    // GPS 없는 사진: 위치 수동 지정 대기열에 추가
                    pendingPhotos.push(photoData);
                } else {
                    // GPS 있는 사진: 즉시 업로드
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
        ui.uploadInput.value = '';
    };

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
});