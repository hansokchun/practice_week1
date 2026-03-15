document.addEventListener('DOMContentLoaded', async () => {
    // 1. STATE MANAGEMENT
    let state = {
        photos: [],
        sharedPhotos: [],
        myPhotoIds: JSON.parse(localStorage.getItem('my_uploaded_photos') || '[]'),
        myLikedIds: JSON.parse(localStorage.getItem('my_liked_photos') || '[]'),
        viewMode: 'my', // 'my' or 'shared'
        showOnlyLiked: false,
        activeDate: 'all',
        currentPhoto: null,
        searchQuery: '',
        isDenseGrid: false
    };

    // 2. UI REFERENCES
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
        btnCopyLink: document.getElementById('btn-copy-link'),
        detailImg: document.getElementById('detail-image'),
        detailDate: document.getElementById('detail-date'),
        editTitle: document.getElementById('edit-title'),
        editDesc: document.getElementById('edit-desc'),
        detailLikeBtn: document.getElementById('detail-like-btn'),
        detailShareBtn: document.getElementById('detail-share-btn'),
        btnSaveEdit: document.getElementById('btn-save-edit'),
        likeCountBadge: document.getElementById('like-count-badge'),

        // Comments
        commentsList: document.getElementById('comments-list'),
        commentInput: document.getElementById('comment-input'),
        btnSendComment: document.getElementById('btn-send-comment')
    };

    // 3. MAP SETUP
    const map = L.map('map', { zoomControl: false, maxZoom: 19 }).setView([36.2048, 138.2529], 6);
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko', { 
        attribution: 'Google Maps',
        maxZoom: 19
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

    // 4. CORE LOGIC
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
            const response = await fetch('/api/photos');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            const data = await response.json();
            
            // Map data and normalize values
            const cloudPhotos = data.map(p => ({ 
                ...p, 
                liked: Number(p.liked || 0), 
                shared: !!p.shared 
            }));
            
            state.photos = cloudPhotos;
            state.sharedPhotos = cloudPhotos.filter(p => p.shared); 
            
            renderAll();

            // Check for deep link (URL hash)
            const hashId = window.location.hash.slice(1);
            if (hashId) {
                const linkedPhoto = state.photos.find(p => p.id == hashId);
                if (linkedPhoto) {
                    setTimeout(() => showDetail(linkedPhoto), 500);
                }
            }
        } catch (e) {
            console.error("Cloud Sync Error:", e);
            showToast(`Cloud Error: ${e.message}`, "warning");
        }
    }

    function renderAll(filterDate = 'all') {
        state.activeDate = filterDate;
        const isMyView = state.viewMode === 'my';
        const currentZoom = map.getZoom();
        
        // 1. 사이드바 그리드용 리스트 (현재 탭에 따라 필터링 유지)
        const gridList = (isMyView 
            ? state.photos.filter(p => state.myPhotoIds.includes(p.id.toString()) || state.myPhotoIds.includes(Number(p.id))) 
            : state.sharedPhotos)
            .filter(p => !state.showOnlyLiked || state.myLikedIds.includes(p.id.toString()))
            .filter(p => filterDate === 'all' || p.date === filterDate)
            .filter(p => !state.searchQuery || (p.description || '').toLowerCase().includes(state.searchQuery.toLowerCase()));

        // 2. 지도 표시용 리스트 (내 사진 + 공유된 모든 사진 통합)
        const mapList = state.photos.filter(p => {
            const isMyPhoto = state.myPhotoIds.includes(p.id.toString()) || state.myPhotoIds.includes(Number(p.id));
            const isShared = !!p.shared;
            return isMyPhoto || isShared; // 내 사진이거나 공유된 사진이면 지도에 표시
        })
        .filter(p => !state.showOnlyLiked || state.myLikedIds.includes(p.id.toString()))
        .filter(p => filterDate === 'all' || p.date === filterDate)
        .filter(p => !state.searchQuery || (p.description || '').toLowerCase().includes(state.searchQuery.toLowerCase()));

        // 지도 렌더링
        clusterGroup.clearLayers();
        mapList.forEach(p => {
            const isMyPhoto = state.myPhotoIds.includes(p.id.toString()) || state.myPhotoIds.includes(Number(p.id));
            const isLikedByMe = state.myLikedIds.includes(p.id.toString());
            
            // 개별 마커로 보일 때의 아이콘 설정
            const icon = isLikedByMe ? icons.liked : (isMyPhoto ? icons.my : icons.shared);
            const m = L.marker([p.lat, p.lng], { icon: icon });
            m.on('click', () => {
                showDetail(p);
            });
            clusterGroup.addLayer(m);
        });
        map.addLayer(clusterGroup);

        // 그리드 렌더링 (그리드용 리스트 사용)
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
                    item.innerHTML = `<img src="${p.url}" loading="lazy">`;
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
        ui.editTitle.value = p.title || '';
        ui.editDesc.value = p.description || '';
        ui.likeCountBadge.textContent = `${p.liked || 0} likes`;
        
        const isMyPhoto = state.myPhotoIds.includes(p.id.toString()) || state.myPhotoIds.includes(Number(p.id));
        const isLikedByMe = state.myLikedIds.includes(p.id.toString());

        // UI Permission Check
        ui.btnSaveEdit.style.display = isMyPhoto ? 'flex' : 'none';
        ui.btnDelete.style.display = isMyPhoto ? 'flex' : 'none';
        ui.btnEditLocation.style.display = isMyPhoto ? 'flex' : 'none';
        ui.detailShareBtn.style.display = isMyPhoto ? 'flex' : 'none';
        ui.editTitle.disabled = !isMyPhoto;
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

        // Update URL hash
        window.history.replaceState(null, null, `#${p.id}`);

        // Load Comments
        loadComments(p.id);
    }

    async function loadComments(photoId) {
        if (!photoId) return;
        ui.commentsList.innerHTML = '<p style="font-size:12px; color:var(--text-muted)">Loading comments...</p>';
        try {
            const res = await fetch(`/api/photos?photo_id=${photoId}`);
            const data = await res.json();
            
            ui.commentsList.innerHTML = '';
            
            // 응답이 배열인지 확인 (백엔드 에러 시 {error, results} 형태로 올 수 있음)
            const comments = Array.isArray(data) ? data : (data.results || []);
            
            if (comments.length === 0) {
                ui.commentsList.innerHTML = '<p style="font-size:12px; color:var(--text-muted); padding: 10px;">No comments yet. Be the first!</p>';
            } else {
                comments.forEach(c => {
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

    const handlePostComment = async () => {
        const text = ui.commentInput.value.trim();
        if (!text || !state.currentPhoto) return;
        
        const photoId = state.currentPhoto.id.toString();
        const originalText = ui.btnSendComment.textContent;
        ui.btnSendComment.textContent = '...';
        ui.btnSendComment.disabled = true;

        try {
            const res = await fetch('/api/photos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'comment',
                    photo_id: photoId,
                    text: text
                })
            });
            
            const result = await res.json();
            
            if (res.ok && result.success) {
                ui.commentInput.value = '';
                await loadComments(photoId);
                showToast("Comment posted!", "success");
            } else {
                throw new Error(result.error || "Failed to post");
            }
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
            ? state.photos.filter(p => state.myPhotoIds.includes(p.id.toString()) || state.myPhotoIds.includes(Number(p.id))) 
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

    // 5. EVENT HANDLERS
    const splash = document.getElementById('splash-screen');
    const btnStart = document.getElementById('btn-start');
    if (btnStart) btnStart.onclick = () => splash.classList.add('hidden');

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
        // Open Street View in the overlay frame
        const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
        ui.streetViewFrame.src = streetViewUrl;
        ui.streetViewOverlay.classList.add('active');
    };

    ui.btnCloseStreetView.onclick = () => {
        ui.streetViewOverlay.classList.remove('active');
        ui.streetViewFrame.src = ''; // Stop the frame
    };

    ui.btnSaveEdit.onclick = async () => {
        if (!state.currentPhoto) return;
        state.currentPhoto.title = ui.editTitle.value;
        state.currentPhoto.description = ui.editDesc.value;
        try {
            await fetch('/api/photos', { method: 'POST', body: JSON.stringify(state.currentPhoto) });
            const btn = ui.btnSaveEdit;
            const originalText = btn.querySelector('span').textContent;
            btn.querySelector('span').textContent = 'Cloud Saved!';
            setTimeout(() => { btn.querySelector('span').textContent = originalText; }, 2000);
            syncData();
        } catch (e) {
            showToast("Cloud Save Failed", "warning");
        }
    };

    ui.btnDelete.onclick = async () => {
        if (!state.currentPhoto) return;
        if (!confirm('Are you sure?')) return;
        try {
            await fetch(`/api/photos?id=${state.currentPhoto.id}`, { method: 'DELETE' });
            state.myPhotoIds = state.myPhotoIds.filter(id => id != state.currentPhoto.id);
            localStorage.setItem('my_uploaded_photos', JSON.stringify(state.myPhotoIds));
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

        await fetch('/api/photos', { method: 'POST', body: JSON.stringify(state.currentPhoto) });
        
        ui.detailLikeBtn.classList.toggle('active', !isLiked);
        ui.likeCountBadge.textContent = `${state.currentPhoto.liked} likes`;
        renderAll(state.activeDate);
    };

    ui.detailShareBtn.onclick = async () => {
        if (!state.currentPhoto) return;
        state.currentPhoto.shared = !state.currentPhoto.shared;
        await fetch('/api/photos', { method: 'POST', body: JSON.stringify(state.currentPhoto) });
        ui.detailShareBtn.classList.toggle('active', state.currentPhoto.shared);
        showToast(state.currentPhoto.shared ? "Shared to Community" : "Removed from Community", "success");
        syncData();
    };

    ui.uploadInput.onchange = async (e) => {
        const files = e.target.files;
        if (!files.length) return;
        
        const pendingPhotos = [];
        showToast("Processing photos...", "info");
        
        for (const f of Array.from(files)) {
            try {
                const exif = await exifr.parse(f);
                const url = await new Promise(r => { 
                    const rd = new FileReader(); 
                    rd.onload = ev => r(rd.result); 
                    rd.readAsDataURL(f); 
                });
                
                const newId = Date.now() + Math.random();
                const data = { 
                    id: newId, url, date: (exif?.DateTimeOriginal || new Date()).toISOString().split('T')[0], 
                    title: f.name, description: '', lat: exif?.latitude, lng: exif?.longitude, liked: 0, shared: false
                };

                state.myPhotoIds.push(newId.toString());
                localStorage.setItem('my_uploaded_photos', JSON.stringify(state.myPhotoIds));

                if (!data.lat || !data.lng) {
                    pendingPhotos.push(data);
                } else {
                    await fetch('/api/photos', { method: 'POST', body: JSON.stringify(data) });
                }
            } catch (err) { console.error(err); }
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
        const guideThumb = document.getElementById('guide-thumb');
        document.body.classList.add('picking-location');
        guideThumb.src = p.url;
        clusterGroup.eachLayer(m => m.options.interactive = false);
        map.once('click', async (e) => {
            p.lat = e.latlng.lat; p.lng = e.latlng.lng;
            await fetch('/api/photos', { method: 'POST', body: JSON.stringify(p) });
            clusterGroup.eachLayer(m => m.options.interactive = true);
            document.body.classList.remove('picking-location');
            syncData();
            startLocationPicker(list);
        });
    }

    syncData();

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