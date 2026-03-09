document.addEventListener('DOMContentLoaded', async () => {
    // 1. STATE MANAGEMENT
    let state = {
        photos: [],
        sharedPhotos: [],
        currentSelected: null,
        viewMode: 'my', // 'my' or 'shared'
        showOnlyLiked: false,
        gridMode: true,
        isPathActive: false
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
        panelExplore: document.getElementById('panel-explore'),
        panelDetail: document.getElementById('panel-detail'),
        grid: document.getElementById('grid-container'),
        dateChips: document.getElementById('date-chips'),
        
        // Detail UI
        detailImg: document.getElementById('detail-image'),
        detailTitle: document.getElementById('detail-title'),
        detailDate: document.getElementById('detail-date'),
        detailLikes: document.getElementById('detail-likes'),
        commentList: document.getElementById('comment-list'),
        commentForm: document.getElementById('comment-form'),
        commentInput: document.getElementById('comment-input'),
        btnLike: document.getElementById('btn-like'),
        btnDownload: document.getElementById('btn-download'),
        bigHeart: document.getElementById('big-heart'),
        
        // Buttons
        btnMyFeed: document.getElementById('btn-my-feed'),
        btnSharedFeed: document.getElementById('btn-shared-feed'),
        btnFilterLiked: document.getElementById('filter-liked'),
        btnTogglePath: document.getElementById('btn-path'),
        btnViewMap: document.getElementById('btn-view-map'),
        btnViewGrid: document.getElementById('btn-view-grid'),
        btnBack: document.getElementById('btn-back'),
        btnExpand: document.getElementById('btn-expand'),
        btnReset: document.getElementById('btn-reset'),
        uploadInput: document.getElementById('upload-input')
    };

    // 3. MAP SETUP
    const map = L.map('map', { zoomControl: false, maxZoom: 21 }).setView([36.2048, 138.2529], 6);
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko', { attribution: 'Google Maps' }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const heartIcon = L.divIcon({ className: 'heart-icon', html: '❤️', iconSize: [30, 30], iconAnchor: [15, 15] });
    const clusterGroup = L.markerClusterGroup({ 
        spiderfyOnMaxZoom: true, 
        showCoverageOnHover: false,
        iconCreateFunction: (c) => L.divIcon({ html: `<span>${c.getChildCount()}</span>`, className: 'cluster-icon', iconSize: [32, 32] })
    });
    let pathLine = null;

    // 4. CORE LOGIC
    async function syncData() {
        const db = await dbPromise;
        state.photos = await db.getAll(photoStore);
        state.sharedPhotos = await db.getAll(sharedStore);
        renderAll();
    }

    function renderAll(filterDate = 'all') {
        const targetList = (state.viewMode === 'my' ? state.photos : state.sharedPhotos)
            .filter(p => !state.showOnlyLiked || p.liked)
            .filter(p => filterDate === 'all' || p.date === filterDate);

        // Map Render
        clusterGroup.clearLayers();
        targetList.forEach(p => {
            const m = L.marker([p.lat, p.lng], { icon: heartIcon });
            m.on('click', () => { selectStory(p); openDetail(); });
            clusterGroup.addLayer(m);
        });
        map.addLayer(clusterGroup);

        // Grid Render
        ui.grid.innerHTML = '';
        targetList.forEach(p => {
            const item = document.createElement('div');
            item.className = 'grid-item';
            item.innerHTML = `<img src="${p.url}" loading="lazy">`;
            item.onclick = () => { map.setView([p.lat, p.lng], 18); selectStory(p); openDetail(); };
            ui.grid.appendChild(item);
        });

        // Toggle UI states
        ui.grid.style.display = state.gridMode ? 'grid' : 'none';
        ui.btnViewGrid.classList.toggle('active', state.gridMode);
        ui.btnViewMap.classList.toggle('active', !state.gridMode);
        ui.btnMyFeed.classList.toggle('active', state.viewMode === 'my');
        ui.btnSharedFeed.classList.toggle('active', state.viewMode === 'shared');
        ui.btnFilterLiked.classList.toggle('active', state.showOnlyLiked);
        
        renderDateChips();
    }

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

    function selectStory(story) {
        state.currentSelected = story;
        ui.detailImg.src = story.url;
        ui.detailTitle.textContent = story.description || 'A moment captured.';
        ui.detailDate.textContent = story.date;
        ui.detailLikes.textContent = story.likes || 0;
        ui.btnDownload.href = story.url;
        ui.btnLike.textContent = story.liked ? '❤️' : '🤍';
        renderComments();
    }

    function renderComments() {
        ui.commentList.innerHTML = '';
        if (state.currentSelected.comments) {
            state.currentSelected.comments.forEach(c => {
                const li = document.createElement('li');
                li.textContent = c;
                ui.commentList.appendChild(li);
            });
        }
    }

    // 5. EVENT HANDLERS
    ui.toggleBtn.onclick = () => {
        const isHidden = ui.sidebar.classList.toggle('hidden');
        ui.toggleBtn.textContent = isHidden ? '▶' : '◀';
        refreshMapSize();
    };

    function openDetail() {
        ui.panelExplore.classList.remove('active');
        ui.panelDetail.classList.add('active');
        ui.sidebar.classList.add('expanded');
        refreshMapSize();
    }

    function closeDetail() {
        ui.panelDetail.classList.remove('active');
        ui.panelExplore.classList.add('active');
        ui.sidebar.classList.remove('expanded');
        state.currentSelected = null;
        refreshMapSize();
    }

    ui.btnBack.onclick = closeDetail;
    ui.btnExpand.onclick = () => { ui.sidebar.classList.toggle('expanded'); refreshMapSize(); };

    function refreshMapSize() {
        const start = performance.now();
        const step = (now) => {
            map.invalidateSize();
            if (now - start < 500) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    ui.btnLike.onclick = async () => {
        const s = state.currentSelected;
        s.liked = !s.liked;
        s.likes = s.liked ? (s.likes || 0) + 1 : Math.max(0, (s.likes || 1) - 1);
        ui.btnLike.textContent = s.liked ? '❤️' : '🤍';
        ui.detailLikes.textContent = s.likes;
        if (s.liked) { ui.bigHeart.classList.add('animate'); setTimeout(() => ui.bigHeart.classList.remove('animate'), 600); }
        
        const db = await dbPromise;
        await db.put(state.viewMode === 'my' ? photoStore : sharedStore, s);
        if (state.showOnlyLiked) renderAll(state.activeDate);
    };

    ui.commentForm.onsubmit = async (e) => {
        e.preventDefault();
        const text = ui.commentInput.value.trim();
        if (text) {
            if (!state.currentSelected.comments) state.currentSelected.comments = [];
            state.currentSelected.comments.push(text);
            ui.commentInput.value = '';
            const db = await dbPromise;
            await db.put(state.viewMode === 'my' ? photoStore : sharedStore, state.currentSelected);
            renderComments();
        }
    };

    ui.btnMyFeed.onclick = () => { state.viewMode = 'my'; state.showOnlyLiked = false; renderAll(); };
    ui.btnSharedFeed.onclick = () => { state.viewMode = 'shared'; state.showOnlyLiked = false; renderAll(); };
    ui.btnFilterLiked.onclick = () => { state.showOnlyLiked = !state.showOnlyLiked; renderAll(state.activeDate); };
    ui.btnViewGrid.onclick = () => { state.gridMode = true; renderAll(state.activeDate); };
    ui.btnViewMap.onclick = () => { state.gridMode = false; renderAll(state.activeDate); };

    ui.dateChips.onclick = (e) => {
        if (e.target.classList.contains('chip')) {
            state.activeDate = e.target.dataset.date;
            renderAll(state.activeDate);
        }
    };

    ui.btnTogglePath.onclick = () => {
        state.isPathActive = !state.isPathActive;
        ui.btnTogglePath.classList.toggle('active', state.isPathActive);
        if (state.isPathActive) {
            const list = state.viewMode === 'my' ? state.photos : state.sharedPhotos;
            if (list.length < 2) return alert('2+ photos needed.');
            const coords = [...list].sort((a,b) => new Date(a.date) - new Date(b.date)).map(p => [p.lat, p.lng]);
            pathLine = L.polyline(coords, { color: '#1a1a1a', weight: 2, dashArray: '5, 10', opacity: 0.6 }).addTo(map);
            map.fitBounds(pathLine.getBounds(), { padding: [50,50] });
        } else if (pathLine) { map.removeLayer(pathLine); }
    };

    ui.uploadInput.onchange = async (e) => {
        const files = e.target.files;
        if (!files.length) return;
        const newPhotos = [];
        const noGps = [];
        for (const f of Array.from(files)) {
            const exif = await exifr.parse(f);
            const url = await new Promise(r => { const reader = new FileReader(); reader.onload = ev => r(reader.result); reader.readAsDataURL(f); });
            const data = { 
                id: Date.now() + Math.random(), 
                url, 
                date: (exif?.DateTimeOriginal || new Date()).toISOString().split('T')[0], 
                description: exif?.ImageDescription || f.name, 
                lat: exif?.latitude, lng: exif?.longitude, 
                liked: false, likes: 0, comments: [] 
            };
            if (data.lat) newPhotos.push(data); else noGps.push(data);
        }
        if (newPhotos.length) { 
            const db = await dbPromise;
            const tx = db.transaction(photoStore, 'readwrite');
            for(const p of newPhotos) await tx.store.put(p);
            await tx.done;
            state.photos.push(...newPhotos);
            state.viewMode = 'my'; renderAll();
        }
        if (noGps.length) { if(confirm(`${noGps.length} photos lack GPS. Pin them?`)) startLocationPicker(noGps); }
        ui.uploadInput.value = '';
    };

    function startLocationPicker(list) {
        if (!list.length) return alert('Finished.');
        const p = list.shift();
        ui.sidebar.classList.add('hidden'); // Hide sidebar to focus on map
        alert(`Click map to pin: ${p.description}`);
        clusterGroup.eachLayer(m => m.options.interactive = false); // Global disable
        map.once('click', async (e) => {
            p.lat = e.latlng.lat; p.lng = e.latlng.lng;
            const db = await dbPromise; await db.put(photoStore, p);
            state.photos.push(p);
            ui.sidebar.classList.remove('hidden');
            clusterGroup.eachLayer(m => m.options.interactive = true);
            renderAll();
            startLocationPicker(list);
        });
    }

    ui.btnReset.onclick = async () => {
        if (confirm('Delete everything?')) {
            const db = await dbPromise; await db.clear(photoStore);
            state.photos = []; closeDetail(); renderAll();
        }
    };

    syncData();
});