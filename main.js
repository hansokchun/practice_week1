document.addEventListener('DOMContentLoaded', async () => {
    // 1. STATE MANAGEMENT
    let state = {
        photos: [],
        sharedPhotos: [],
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
        detailImg: document.getElementById('detail-image'),
        detailDate: document.getElementById('detail-date'),
        editTitle: document.getElementById('edit-title'),
        editDesc: document.getElementById('edit-desc'),
        detailLikeBtn: document.getElementById('detail-like-btn'),
        detailShareBtn: document.getElementById('detail-share-btn'),
        btnSaveEdit: document.getElementById('btn-save-edit')
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
            html: `<span>${c.getChildCount()}</span>`, 
            className: 'cluster-icon', 
            iconSize: [36, 36] 
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
            
            // Map data and normalize booleans
            const cloudPhotos = data.map(p => ({ 
                ...p, 
                liked: !!p.liked, 
                shared: !!p.shared 
            }));
            
            state.photos = cloudPhotos;
            state.sharedPhotos = cloudPhotos.filter(p => p.shared); 
            
            renderAll();
        } catch (e) {
            console.error("Cloud Sync Error:", e);
            showToast(`Cloud Error: ${e.message}`, "warning");
        }
    }

    function renderAll(filterDate = 'all') {
        state.activeDate = filterDate;
        const isMyView = state.viewMode === 'my';
        const targetList = (isMyView ? state.photos : state.sharedPhotos)
            .filter(p => !state.showOnlyLiked || p.liked)
            .filter(p => filterDate === 'all' || p.date === filterDate)
            .filter(p => !state.searchQuery || (p.description || '').toLowerCase().includes(state.searchQuery.toLowerCase()));

        // Map Render
        clusterGroup.clearLayers();
        targetList.forEach(p => {
            let icon = icons.liked;
            if (!p.liked) {
                icon = isMyView ? icons.my : icons.shared;
            }
            const m = L.marker([p.lat, p.lng], { icon: icon });
            m.on('click', () => {
                showDetail(p);
            });
            clusterGroup.addLayer(m);
        });
        map.addLayer(clusterGroup);

        // Group photos by date
        const groups = targetList.reduce((acc, p) => {
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

    function showDetail(p) {
        state.currentPhoto = p;
        ui.detailImg.src = p.url;
        ui.detailDate.textContent = p.date;
        ui.editTitle.value = p.title || '';
        ui.editDesc.value = p.description || '';
        ui.detailLikeBtn.classList.toggle('active', !!p.liked);
        ui.detailShareBtn.classList.toggle('active', !!p.shared);

        ui.sidebar.classList.remove('hidden');
        ui.sidebar.classList.add('expanded');
        ui.panelExplore.classList.remove('active');
        ui.panelDetail.classList.add('active');
        ui.toggleBtn.textContent = '◀';
        
        map.setView([p.lat, p.lng], 18);
        refreshMapSize();
    }

    function closeDetail() {
        ui.sidebar.classList.remove('expanded');
        ui.panelExplore.classList.add('active');
        ui.panelDetail.classList.remove('active');
        state.currentPhoto = null;
        refreshMapSize();
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
        const list = state.viewMode === 'my' ? state.photos : state.sharedPhotos;
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
            closeDetail();
            syncData();
            showToast("Deleted from cloud", "info");
        } catch (e) {
            showToast("Delete Failed", "warning");
        }
    };

    ui.detailLikeBtn.onclick = async () => {
        if (!state.currentPhoto) return;
        state.currentPhoto.liked = !state.currentPhoto.liked;
        await fetch('/api/photos', { method: 'POST', body: JSON.stringify(state.currentPhoto) });
        ui.detailLikeBtn.classList.toggle('active', state.currentPhoto.liked);
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
        showToast("Uploading to cloud...", "info");
        for (const f of Array.from(files)) {
            const exif = await exifr.parse(f);
            const url = await new Promise(r => { const rd = new FileReader(); rd.onload = ev => r(rd.result); rd.readAsDataURL(f); });
            const data = { 
                id: Date.now() + Math.random(), url, date: (exif?.DateTimeOriginal || new Date()).toISOString().split('T')[0], 
                title: f.name, description: '', lat: exif?.latitude, lng: exif?.longitude, liked: false, shared: false
            };
            await fetch('/api/photos', { method: 'POST', body: JSON.stringify(data) });
        }
        syncData();
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
            syncData();
            startLocationPicker(list);
        });
    }

    syncData();

    // 6. BOTTOM SHEET RESIZING (Mobile)
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