// ===========================================
// Travelgram — Supabase Auth 기반 메인 스크립트
// ===========================================
// Supabase JS 클라이언트(CDN)로 이메일/비밀번호 + OAuth 로그인.
// 인증 토큰은 Authorization 헤더로 API에 전달.

// --- Supabase 설정 ---
// 아래 값을 본인의 Supabase 프로젝트 값으로 교체하세요.
// Supabase 대시보드 → Settings → API 에서 확인 가능.
// 왜 하드코딩: SUPABASE_URL과 ANON_KEY는 공개 키 (Stripe publishable key처럼).
const SUPABASE_URL = 'https://pqczcponriukilrtpbdl.supabase.co';       // 예: https://abcdefgh.supabase.co
const SUPABASE_ANON_KEY = 'sb_publishable_m158oMsJtKHn2sUD3m7x-w_Rs6swjl8'; // 예: eyJhbGciOiJ...

document.addEventListener('DOMContentLoaded', async () => {
    // ===========================================
    // 1. SUPABASE 클라이언트 초기화
    // ===========================================
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ===========================================
    // 2. STATE MANAGEMENT
    // ===========================================
    let state = {
        user: null,          // { id, display_name, email } — Supabase 유저 정보
        session: null,       // Supabase 세션 (access_token 포함)
        photos: [],
        sharedPhotos: [],
        myLikedIds: [],
        viewMode: 'my',
        showOnlyLiked: false,
        activeDate: 'all',
        currentPhoto: null,
        searchQuery: '',
        isDenseGrid: false
    };

    // 헬퍼: 내 사진인지 확인 (서버의 owner_id 기반)
    const isMyPhoto = (p) => p.owner_id === state.user?.id;
    // 헬퍼: 내가 좋아요한 사진인지 확인
    const isLikedByMe = (id) => state.myLikedIds.includes(id.toString());

    // ===========================================
    // 3. AUTH 함수 (Supabase)
    // ===========================================

    // API 호출 시 Supabase access_token을 Authorization 헤더에 포함
    // 왜 헤더: Supabase는 쿠키 대신 localStorage에 토큰 저장,
    // 서버에 자동 전송되지 않으므로 명시적으로 전달해야 함.
    async function authFetch(url, options = {}) {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = { ...(options.headers || {}) };
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        return fetch(url, { ...options, headers });
    }

    // Supabase 유저 객체에서 앱에 필요한 정보 추출
    function extractUser(supabaseUser) {
        if (!supabaseUser) return null;
        return {
            id: supabaseUser.id,
            display_name: supabaseUser.user_metadata?.display_name
                || supabaseUser.user_metadata?.full_name
                || supabaseUser.email?.split('@')[0]
                || 'User',
            email: supabaseUser.email || ''
        };
    }

    // 로그인 성공 시 호출
    function onSignedIn(session) {
        state.session = session;
        state.user = extractUser(session.user);
        hideAuthModal();
        updateUserUI();
        syncData();
        showToast(`환영합니다, ${state.user.display_name}!`, "success");
    }

    // 로그아웃 시 호출
    function onSignedOut() {
        state.session = null;
        state.user = null;
        state.photos = [];
        state.sharedPhotos = [];
        state.myLikedIds = [];
        updateUserUI();
        showAuthModal();
    }

    // 인증 모달 표시/숨기기
    function showAuthModal() {
        document.getElementById('auth-modal').classList.add('active');
    }

    function hideAuthModal() {
        document.getElementById('auth-modal').classList.remove('active');
    }

    // 유저 UI 업데이트 (이름 표시, 로그아웃 버튼)
    function updateUserUI() {
        const infoBar = document.getElementById('user-info-bar');
        if (state.user) {
            ui.userDisplayName.textContent = state.user.display_name;
            infoBar.style.display = 'flex';
        } else {
            infoBar.style.display = 'none';
        }
    }

    // ===========================================
    // 4. UI REFERENCES
    // ===========================================
    const ui = {
        sidebar: document.getElementById('sidebar'),
        toggleBtn: document.getElementById('sidebar-toggle'),
        grid: document.getElementById('grid-container'),
        dateChips: document.getElementById('date-chips'),

        panelExplore: document.getElementById('panel-explore'),
        panelDetail: document.getElementById('panel-detail'),

        btnMyFeed: document.getElementById('btn-my-feed'),
        btnSharedFeed: document.getElementById('btn-shared-feed'),
        btnFilterLiked: document.getElementById('filter-liked'),
        uploadInput: document.getElementById('upload-input'),
        searchInput: document.getElementById('search-input'),
        btnGridDensity: document.getElementById('btn-grid-density'),

        btnBack: document.getElementById('btn-back'),
        btnDelete: document.getElementById('btn-delete'),
        btnEditLocation: document.getElementById('btn-edit-location'),
        btnStreetView: document.getElementById('btn-street-view'),
        btnCopyLink: document.getElementById('btn-copy-link'),
        detailImg: document.getElementById('detail-image'),
        detailDate: document.getElementById('detail-date'),
        editTitle: document.getElementById('edit-title'),
        editDesc: document.getElementById('edit-desc'),
        detailLikeBtn: document.getElementById('detail-like-btn'),
        detailShareBtn: document.getElementById('detail-share-btn'),
        btnSaveEdit: document.getElementById('btn-save-edit'),
        likeCountBadge: document.getElementById('like-count-badge'),

        commentsList: document.getElementById('comments-list'),
        commentInput: document.getElementById('comment-input'),
        btnSendComment: document.getElementById('btn-send-comment'),

        streetViewOverlay: document.getElementById('street-view-overlay'),
        streetViewFrame: document.getElementById('street-view-frame'),
        btnCloseStreetView: document.getElementById('btn-close-street-view'),

        userDisplayName: document.getElementById('user-display-name'),
        btnLogout: document.getElementById('btn-logout')
    };

    // ===========================================
    // 5. MAP SETUP
    // ===========================================
    const map = L.map('map', { zoomControl: false, maxZoom: 19 }).setView([36.2048, 138.2529], 6);
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko', {
        attribution: 'Google Maps', maxZoom: 19
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const icons = {
        liked: L.divIcon({
            className: 'map-icon icon-liked',
            html: `<svg viewBox="0 0 24 24" width="30" height="30" fill="var(--danger-color)" stroke="var(--danger-color)" stroke-width="1"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
            iconSize: [30, 30], iconAnchor: [15, 15]
        }),
        my: L.divIcon({
            className: 'map-icon icon-my',
            html: `<svg viewBox="0 0 24 24" width="30" height="30" fill="#3b82f6"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
            iconSize: [30, 30], iconAnchor: [15, 30]
        }),
        shared: L.divIcon({
            className: 'map-icon icon-shared',
            html: `<svg viewBox="0 0 24 24" width="30" height="30" fill="#737373"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
            iconSize: [30, 30], iconAnchor: [15, 30]
        })
    };

    const clusterGroup = L.markerClusterGroup({
        spiderfyOnMaxZoom: true, showCoverageOnHover: false,
        iconCreateFunction: (c) => L.divIcon({
            html: `<div class="custom-cluster-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <span class="cluster-count">${c.getChildCount()}</span>
            </div>`,
            className: 'cluster-wrapper', iconSize: [44, 44]
        })
    });

    // ===========================================
    // 6. CORE LOGIC
    // ===========================================
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
            const response = await authFetch('/api/photos');

            if (!response.ok) {
                if (response.status === 401) {
                    showAuthModal();
                    return;
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const cloudPhotos = (data.photos || []).map(p => ({
                ...p, liked: Number(p.liked || 0), shared: !!p.shared
            }));

            state.photos = cloudPhotos;
            state.sharedPhotos = cloudPhotos.filter(p => p.shared);
            state.myLikedIds = (data.likedIds || []).map(id => id.toString());

            renderAll();

            // 딥 링크 처리
            const hashId = window.location.hash.slice(1);
            if (hashId) {
                const linkedPhoto = state.photos.find(p => p.id == hashId);
                if (linkedPhoto) setTimeout(() => showDetail(linkedPhoto), 500);
            }
        } catch (e) {
            console.error("Cloud Sync Error:", e);
            showToast(`Cloud Error: ${e.message}`, "warning");
        }
    }

    function renderAll(filterDate = 'all') {
        state.activeDate = filterDate;
        const isMyView = state.viewMode === 'my';

        const gridList = (isMyView
            ? state.photos.filter(p => isMyPhoto(p))
            : state.sharedPhotos)
            .filter(p => !state.showOnlyLiked || isLikedByMe(p.id))
            .filter(p => filterDate === 'all' || p.date === filterDate)
            .filter(p => !state.searchQuery || (p.description || '').toLowerCase().includes(state.searchQuery.toLowerCase()));

        const mapList = state.photos
            .filter(p => isMyPhoto(p) || !!p.shared)
            .filter(p => !state.showOnlyLiked || isLikedByMe(p.id))
            .filter(p => filterDate === 'all' || p.date === filterDate)
            .filter(p => !state.searchQuery || (p.description || '').toLowerCase().includes(state.searchQuery.toLowerCase()));

        // 지도
        clusterGroup.clearLayers();
        mapList.forEach(p => {
            const icon = isLikedByMe(p.id) ? icons.liked : (isMyPhoto(p) ? icons.my : icons.shared);
            const m = L.marker([p.lat, p.lng], { icon });
            m.on('click', () => showDetail(p));
            clusterGroup.addLayer(m);
        });
        map.addLayer(clusterGroup);

        // 그리드
        const groups = gridList.reduce((acc, p) => {
            if (!acc[p.date]) acc[p.date] = [];
            acc[p.date].push(p);
            return acc;
        }, {});
        const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

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
                    item.innerHTML = `<img src="${p.url}" loading="lazy">`;
                    item.onclick = () => showDetail(p);
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
        ui.editTitle.value = p.title || '';
        ui.editDesc.value = p.description || '';
        ui.likeCountBadge.textContent = `${p.liked || 0} likes`;

        const isMine = isMyPhoto(p);
        ui.btnSaveEdit.style.display = isMine ? 'flex' : 'none';
        ui.btnDelete.style.display = isMine ? 'flex' : 'none';
        ui.btnEditLocation.style.display = isMine ? 'flex' : 'none';
        ui.detailShareBtn.style.display = isMine ? 'flex' : 'none';
        ui.editTitle.disabled = !isMine;
        ui.editDesc.disabled = !isMine;
        ui.detailLikeBtn.classList.toggle('active', isLikedByMe(p.id));
        ui.detailShareBtn.classList.toggle('active', !!p.shared);

        ui.sidebar.classList.remove('hidden');
        ui.sidebar.classList.add('expanded');
        ui.panelExplore.classList.remove('active');
        ui.panelDetail.classList.add('active');
        ui.toggleBtn.textContent = '◀';

        map.setView([p.lat, p.lng], 18);
        refreshMapSize();
        window.history.replaceState(null, null, `#${p.id}`);
        loadComments(p.id);
    }

    async function loadComments(photoId) {
        if (!photoId) return;
        ui.commentsList.innerHTML = '<p style="font-size:12px; color:var(--text-muted)">Loading comments...</p>';
        try {
            const res = await authFetch(`/api/photos?photo_id=${photoId}`);
            const data = await res.json();
            ui.commentsList.innerHTML = '';
            const comments = Array.isArray(data) ? data : (data.results || []);
            if (comments.length === 0) {
                ui.commentsList.innerHTML = '<p style="font-size:12px; color:var(--text-muted); padding: 10px;">No comments yet. Be the first!</p>';
            } else {
                comments.forEach(c => {
                    const el = document.createElement('div');
                    el.className = 'comment-item';
                    el.innerHTML = `
                        <div class="comment-author">${c.user_name || 'Anonymous'}</div>
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

    const handlePostComment = async () => {
        const text = ui.commentInput.value.trim();
        if (!text || !state.currentPhoto) return;
        const photoId = state.currentPhoto.id.toString();
        const btn = ui.btnSendComment;
        btn.textContent = '...'; btn.disabled = true;
        try {
            const res = await authFetch('/api/photos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'comment', photo_id: photoId, text })
            });
            const result = await res.json();
            if (res.ok && result.success) {
                ui.commentInput.value = '';
                await loadComments(photoId);
                showToast("Comment posted!", "success");
            } else throw new Error(result.error || "Failed to post");
        } catch (e) {
            showToast(`Error: ${e.message}`, "warning");
        } finally {
            btn.textContent = 'Post'; btn.disabled = false;
        }
    };

    ui.btnSendComment.onclick = handlePostComment;
    ui.commentInput.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(); }
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
        const list = state.viewMode === 'my'
            ? state.photos.filter(p => isMyPhoto(p))
            : state.sharedPhotos;
        const dates = [...new Set(list.map(p => p.date))].sort((a, b) => b.localeCompare(a));
        ui.dateChips.innerHTML = `<button class="chip ${state.activeDate === 'all' ? 'active' : ''}" data-date="all">All Dates</button>`;
        dates.forEach(d => {
            const btn = document.createElement('button');
            btn.className = `chip ${state.activeDate === d ? 'active' : ''}`;
            btn.dataset.date = d;
            btn.textContent = d;
            ui.dateChips.appendChild(btn);
        });
    }

    // ===========================================
    // 7. EVENT HANDLERS
    // ===========================================
    const splash = document.getElementById('splash-screen');
    const btnStart = document.getElementById('btn-start');
    if (btnStart) btnStart.onclick = () => splash.classList.add('hidden');

    ui.toggleBtn.onclick = () => {
        if (ui.sidebar.classList.contains('hidden')) restoreSidebar();
        else minimizeSidebar();
    };

    function refreshMapSize() {
        const start = performance.now();
        const step = (now) => { map.invalidateSize(); if (now - start < 500) requestAnimationFrame(step); };
        requestAnimationFrame(step);
    }

    ui.btnMyFeed.onclick = () => { state.viewMode = 'my'; state.showOnlyLiked = false; renderAll(); };
    ui.btnSharedFeed.onclick = () => { state.viewMode = 'shared'; state.showOnlyLiked = false; renderAll(); };
    ui.btnFilterLiked.onclick = () => { state.showOnlyLiked = !state.showOnlyLiked; renderAll(state.activeDate); };
    ui.searchInput.oninput = (e) => { state.searchQuery = e.target.value; renderAll(state.activeDate); };
    ui.btnGridDensity.onclick = () => { state.isDenseGrid = !state.isDenseGrid; renderAll(state.activeDate); };
    ui.dateChips.onclick = (e) => { if (e.target.classList.contains('chip')) renderAll(e.target.dataset.date); };
    ui.btnBack.onclick = closeDetail;

    ui.btnEditLocation.onclick = () => {
        if (!state.currentPhoto) return;
        showToast("Click on the map to set a new location", "info");
        startLocationPicker([state.currentPhoto]);
    };

    ui.btnStreetView.onclick = () => {
        if (!state.currentPhoto) return;
        const { lat, lng } = state.currentPhoto;
        ui.streetViewFrame.src = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
        ui.streetViewOverlay.classList.add('active');
    };

    ui.btnCloseStreetView.onclick = () => {
        ui.streetViewOverlay.classList.remove('active');
        ui.streetViewFrame.src = '';
    };

    ui.btnSaveEdit.onclick = async () => {
        if (!state.currentPhoto) return;
        state.currentPhoto.title = ui.editTitle.value;
        state.currentPhoto.description = ui.editDesc.value;
        try {
            const res = await authFetch('/api/photos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state.currentPhoto)
            });
            if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
            const span = ui.btnSaveEdit.querySelector('span');
            const orig = span.textContent;
            span.textContent = 'Cloud Saved!';
            setTimeout(() => { span.textContent = orig; }, 2000);
            syncData();
        } catch (e) { showToast(`Save Failed: ${e.message}`, "warning"); }
    };

    ui.btnDelete.onclick = async () => {
        if (!state.currentPhoto || !confirm('Are you sure?')) return;
        try {
            const res = await authFetch(`/api/photos?id=${state.currentPhoto.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
            closeDetail(); syncData();
            showToast("Deleted from cloud", "info");
        } catch (e) { showToast(`Delete Failed: ${e.message}`, "warning"); }
    };

    ui.btnCopyLink.onclick = () => {
        if (!state.currentPhoto) return;
        navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${state.currentPhoto.id}`)
            .then(() => showToast("Direct link copied!", "success"))
            .catch(() => showToast("Failed to copy link", "warning"));
    };

    // 좋아요 토글 (낙관적 업데이트)
    ui.detailLikeBtn.onclick = async () => {
        if (!state.currentPhoto) return;
        const photoId = state.currentPhoto.id.toString();
        const wasLiked = isLikedByMe(photoId);
        const prevLikedIds = [...state.myLikedIds];
        const prevCount = state.currentPhoto.liked || 0;

        // 낙관적 UI 업데이트
        if (wasLiked) {
            state.myLikedIds = state.myLikedIds.filter(id => id !== photoId);
            state.currentPhoto.liked = Math.max(0, prevCount - 1);
        } else {
            state.myLikedIds.push(photoId);
            state.currentPhoto.liked = prevCount + 1;
        }
        ui.detailLikeBtn.classList.toggle('active', !wasLiked);
        ui.likeCountBadge.textContent = `${state.currentPhoto.liked} likes`;
        renderAll(state.activeDate);

        try {
            const res = await authFetch('/api/photos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'like', photo_id: photoId })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const result = await res.json();
            state.currentPhoto.liked = result.count;
            ui.likeCountBadge.textContent = `${result.count} likes`;
        } catch (e) {
            // 롤백
            state.myLikedIds = prevLikedIds;
            state.currentPhoto.liked = prevCount;
            ui.detailLikeBtn.classList.toggle('active', wasLiked);
            ui.likeCountBadge.textContent = `${prevCount} likes`;
            renderAll(state.activeDate);
            showToast(`Like failed: ${e.message}`, "warning");
        }
    };

    // 공유 토글
    ui.detailShareBtn.onclick = async () => {
        if (!state.currentPhoto) return;
        const prev = state.currentPhoto.shared;
        state.currentPhoto.shared = !prev;
        try {
            const res = await authFetch('/api/photos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state.currentPhoto)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            ui.detailShareBtn.classList.toggle('active', state.currentPhoto.shared);
            showToast(state.currentPhoto.shared ? "Shared to Community" : "Removed from Community", "success");
            syncData();
        } catch (e) {
            state.currentPhoto.shared = prev;
            showToast(`Share failed: ${e.message}`, "warning");
        }
    };

    // 사진 업로드
    ui.uploadInput.onchange = async (e) => {
        const files = e.target.files;
        if (!files.length) return;
        const pendingPhotos = [];
        showToast("Processing photos...", "info");

        for (const f of Array.from(files)) {
            try {
                const exif = await exifr.parse(f);
                const url = await new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.readAsDataURL(f); });
                const data = {
                    id: Date.now() + Math.random(), url,
                    date: (exif?.DateTimeOriginal || new Date()).toISOString().split('T')[0],
                    title: f.name, description: '',
                    lat: exif?.latitude, lng: exif?.longitude,
                    liked: 0, shared: false
                };
                if (!data.lat || !data.lng) {
                    pendingPhotos.push(data);
                } else {
                    const res = await authFetch('/api/photos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}`);
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

    function startLocationPicker(list) {
        if (!list.length) { document.body.classList.remove('picking-location'); showToast("Saved!", "success"); return; }
        const p = list.shift();
        document.body.classList.add('picking-location');
        document.getElementById('guide-thumb').src = p.url;
        clusterGroup.eachLayer(m => m.options.interactive = false);
        map.once('click', async (e) => {
            p.lat = e.latlng.lat; p.lng = e.latlng.lng;
            await authFetch('/api/photos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(p)
            });
            clusterGroup.eachLayer(m => m.options.interactive = true);
            document.body.classList.remove('picking-location');
            syncData();
            startLocationPicker(list);
        });
    }

    // ===========================================
    // 8. AUTH MODAL HANDLERS (Supabase 연동)
    // ===========================================
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const authError = document.getElementById('auth-error');

    // 탭 전환
    tabLogin.onclick = () => {
        tabLogin.classList.add('active'); tabRegister.classList.remove('active');
        formLogin.style.display = 'flex'; formRegister.style.display = 'none';
        authError.textContent = '';
    };
    tabRegister.onclick = () => {
        tabRegister.classList.add('active'); tabLogin.classList.remove('active');
        formRegister.style.display = 'flex'; formLogin.style.display = 'none';
        authError.textContent = '';
    };

    // 로그인
    formLogin.onsubmit = async (e) => {
        e.preventDefault();
        authError.textContent = '';
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const btn = formLogin.querySelector('.auth-submit');
        btn.disabled = true; btn.textContent = '로그인 중...';

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            // onAuthStateChange 리스너가 자동으로 onSignedIn 호출
        } catch (err) {
            authError.textContent = err.message;
        } finally {
            btn.disabled = false; btn.textContent = '로그인';
        }
    };

    // 회원가입
    formRegister.onsubmit = async (e) => {
        e.preventDefault();
        authError.textContent = '';
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const btn = formRegister.querySelector('.auth-submit');
        btn.disabled = true; btn.textContent = '가입 중...';

        try {
            // Supabase에 회원가입 + display_name을 user_metadata에 저장
            const { data, error } = await supabase.auth.signUp({
                email, password,
                options: { data: { display_name: name } }
            });
            if (error) throw error;

            // 이메일 확인 필요한 경우 안내
            if (data.user && !data.session) {
                authError.textContent = '확인 이메일을 보냈습니다. 이메일을 확인하세요.';
                authError.style.color = 'var(--accent-color)';
            }
            // 이메일 확인 불필요 시 onAuthStateChange가 자동 처리
        } catch (err) {
            authError.textContent = err.message;
        } finally {
            btn.disabled = false; btn.textContent = '가입하기';
        }
    };

    // Google OAuth 로그인
    document.getElementById('btn-google-login').onclick = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin }
            });
            if (error) throw error;
        } catch (err) {
            authError.textContent = err.message;
        }
    };

    // 로그아웃
    ui.btnLogout.onclick = async () => {
        await supabase.auth.signOut();
        // onAuthStateChange 리스너가 자동으로 onSignedOut 호출
    };

    // ===========================================
    // 9. MOBILE DRAG HANDLE
    // ===========================================
    const dragHandle = document.getElementById('drag-handle');
    let isDragging = false, startY = 0, startHeight = 0;

    const onDragStart = (e) => {
        if (window.innerWidth > 768) return;
        isDragging = true;
        startY = e.type === 'mousedown' ? e.pageY : e.touches[0].pageY;
        startHeight = ui.sidebar.getBoundingClientRect().height;
        ui.sidebar.style.transition = 'none';
        ui.sidebar.classList.remove('expanded');
    };

    const onDragMove = (e) => {
        if (!isDragging) return;
        if (e.cancelable) e.preventDefault();
        const currentY = e.type === 'mousemove' ? e.pageY : e.touches[0].pageY;
        const newHeight = startHeight + (startY - currentY);
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
        const h = ui.sidebar.getBoundingClientRect().height;
        const vh = window.innerHeight;
        if (h > vh * 0.85) { ui.sidebar.style.height = '100vh'; ui.sidebar.classList.add('expanded'); }
        else if (h > vh * 0.35) { ui.sidebar.style.height = '60vh'; }
        else { ui.sidebar.style.height = '15vh'; }
        refreshMapSize();
    };

    dragHandle.addEventListener('mousedown', onDragStart);
    dragHandle.addEventListener('touchstart', onDragStart, { passive: true });
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('touchmove', onDragMove, { passive: false });
    window.addEventListener('mouseup', onDragEnd);
    window.addEventListener('touchend', onDragEnd);

    // ===========================================
    // 10. 앱 초기화 — Supabase 인증 상태 확인
    // ===========================================
    // Supabase 인증 상태 변경 리스너 (로그인/로그아웃/토큰 갱신)
    // 왜 리스너: OAuth 리디렉션, 다른 탭 로그인, 토큰 자동 갱신 등
    // 모든 시나리오를 한 곳에서 처리
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session) onSignedIn(session);
        } else if (event === 'SIGNED_OUT') {
            onSignedOut();
        }
    });

    // 페이지 로드 시 기존 세션 확인
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        onSignedIn(session);
    } else {
        showAuthModal();
    }
});