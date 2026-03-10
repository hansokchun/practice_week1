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

    const dbName = 'TravelgramDB';
    const photoStore = 'photos';
    const sharedStore = 'shared';

    const dbPromise = idb.openDB(dbName, 4, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(photoStore)) db.createObjectStore(photoStore, { keyPath: 'id', autoIncrement: true });
            if (!db.objectStoreNames.contains(sharedStore)) db.createObjectStore(sharedStore, { keyPath: 'id' });
        },
    });

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
        const db = await dbPromise;
        state.photos = await db.getAll(photoStore);
        state.sharedPhotos = await db.getAll(sharedStore);
        renderAll();
    }

    function renderAll(filterDate = 'all') {
        state.activeDate = filterDate;
        const isMyView = state.viewMode === 'my';
        const targetList = (isMyView ? state.photos : state.sharedPhotos)
            .filter(p => !state.showOnlyLiked || p.liked)
            .filter(p => filterDate === 'all' || p.date === filterDate)
            .filter(p => !state.searchQuery || p.description.toLowerCase().includes(state.searchQuery.toLowerCase()));

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

        // Toggle UI states
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

    // MAP CLICK HANDLER for state management
    map.on('click', (e) => {
        // If sidebar is expanded, retract it.
        if (ui.sidebar.classList.contains('expanded')) {
            closeDetail();
        } 
        // If sidebar is in original size (not expanded, not hidden), minimize it.
        else if (!ui.sidebar.classList.contains('hidden')) {
            minimizeSidebar();
        }
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
    if (btnStart) {
        btnStart.onclick = () => {
            splash.classList.add('hidden');
        };
    }

    ui.toggleBtn.onclick = () => {
        const isHidden = ui.sidebar.classList.contains('hidden');
        if (isHidden) {
            restoreSidebar();
        } else {
            minimizeSidebar();
        }
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
        if (e.target.classList.contains('chip')) {
            renderAll(e.target.dataset.date);
        }
    };

    ui.btnBack.onclick = closeDetail;

    ui.btnSaveEdit.onclick = async () => {
        if (!state.currentPhoto) return;
        
        state.currentPhoto.title = ui.editTitle.value;
        state.currentPhoto.description = ui.editDesc.value;
        
        const db = await dbPromise;
        const storeName = state.viewMode === 'my' ? photoStore : sharedStore;
        await db.put(storeName, state.currentPhoto);
        
        // Show a brief feedback
        const btn = ui.btnSaveEdit;
        const originalText = btn.querySelector('span').textContent;
        btn.querySelector('span').textContent = 'Saved!';
        setTimeout(() => { btn.querySelector('span').textContent = originalText; }, 2000);
        
        renderAll(state.activeDate);
    };

    ui.btnDelete.onclick = async () => {
        if (!state.currentPhoto) return;
        if (!confirm('Are you sure you want to delete this photo?')) return;
        
        const db = await dbPromise;
        const storeName = state.viewMode === 'my' ? photoStore : sharedStore;
        await db.delete(storeName, state.currentPhoto.id);
        
        if (state.viewMode === 'my') {
            state.photos = state.photos.filter(p => p.id !== state.currentPhoto.id);
        } else {
            state.sharedPhotos = state.sharedPhotos.filter(p => p.id !== state.currentPhoto.id);
        }
        
        closeDetail();
        renderAll(state.activeDate);
    };

    ui.detailLikeBtn.onclick = async () => {
        if (!state.currentPhoto) return;
        state.currentPhoto.liked = !state.currentPhoto.liked;
        const db = await dbPromise;
        const store = state.viewMode === 'my' ? photoStore : sharedStore;
        await db.put(store, state.currentPhoto);
        ui.detailLikeBtn.classList.toggle('active', state.currentPhoto.liked);
        renderAll(state.activeDate);
    };

    ui.uploadInput.onchange = async (e) => {
        const files = e.target.files;
        if (!files.length) return;
        
        showToast(`${files.length} photos processing...`, 'info');
        
        const newPhotos = [];
        const noGps = [];
        
        for (const f of Array.from(files)) {
            try {
                const exif = await exifr.parse(f);
                const url = await new Promise(r => { 
                    const reader = new FileReader(); 
                    reader.onload = ev => r(reader.result); 
                    reader.readAsDataURL(f); 
                });
                
                const data = { 
                    id: Date.now() + Math.random(), 
                    url, 
                    date: (exif?.DateTimeOriginal || new Date()).toISOString().split('T')[0], 
                    title: exif?.ImageDescription || f.name,
                    description: '', 
                    lat: exif?.latitude, lng: exif?.longitude, 
                    liked: false, likes: 0, comments: [] 
                };
                
                if (data.lat) {
                    newPhotos.push(data);
                } else {
                    noGps.push(data);
                }
            } catch (err) {
                console.error("EXIF Error:", err);
            }
        }

        if (newPhotos.length) { 
            const db = await dbPromise;
            const tx = db.transaction(photoStore, 'readwrite');
            for(const p of newPhotos) await tx.store.put(p);
            await tx.done;
            state.photos.push(...newPhotos);
            state.viewMode = 'my'; 
            renderAll();
            showToast(`${newPhotos.length} stories added to map!`, 'success');
        }
        
        if (noGps.length) { 
            showToast(`${noGps.length} photos lack GPS data. Please pin them on the map.`, 'warning');
            startLocationPicker(noGps);
        }
        
        ui.uploadInput.value = '';
    };

    function startLocationPicker(list) {
        if (!list.length) {
            document.body.classList.remove('picking-location');
            showToast("All locations set!", 'success');
            return;
        }
        
        const p = list.shift();
        const guide = document.getElementById('map-picker-guide');
        const guideThumb = document.getElementById('guide-thumb');
        
        document.body.classList.add('picking-location');
        guideThumb.src = p.url;
        
        // Disable other map interactions temporarily
        clusterGroup.eachLayer(m => m.options.interactive = false);
        
        map.once('click', async (e) => {
            p.lat = e.latlng.lat; 
            p.lng = e.latlng.lng;
            
            const db = await dbPromise; 
            await db.put(photoStore, p);
            state.photos.push(p);
            
            clusterGroup.eachLayer(m => m.options.interactive = true);
            renderAll();
            
            // Continue with next photo if any
            startLocationPicker(list);
        });
    }

    syncData();
});