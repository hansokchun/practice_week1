document.addEventListener('DOMContentLoaded', async () => {
    let photos = [];
    let sharedPhotos = [];
    let currentSelectedPhoto = null;
    let viewMode = 'my'; // 'my' or 'shared'
    let showOnlyLiked = false;
    let gridMode = true; // Default to Grid View

    const dbName = 'JapanTripDB';
    const photoStoreName = 'photos';
    const sharedStoreName = 'sharedPhotos';

    const dbPromise = idb.openDB(dbName, 3, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(photoStoreName)) {
                db.createObjectStore(photoStoreName, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(sharedStoreName)) {
                db.createObjectStore(sharedStoreName, { keyPath: 'id' });
            }
        },
    });

    const mapContainer = document.getElementById('map');
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    
    // Max Zoom increased to 21 for ultra-precise positioning
    const map = L.map(mapContainer, {
        zoomControl: false,
        maxZoom: 21
    }).setView([36.2048, 138.2529], 5.5);
    
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    
    let routeLine = null;

    // Elegant heart marker (Red for better visibility)
    const heartIcon = L.divIcon({ 
        className: 'heart-icon', 
        html: '❤️', 
        iconSize: [30, 30], 
        iconAnchor: [15, 15] 
    });

    // Configure Cluster with Spiderfy for overlapping points
    const markers = L.markerClusterGroup({
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        maxClusterRadius: 40,
        iconCreateFunction: function(cluster) {
            return L.divIcon({ 
                html: `<span>${cluster.getChildCount()}</span>`, 
                className: 'cluster-icon', 
                iconSize: L.point(32, 32) 
            });
        }
    });

    // UI Refs
    const exploreView = document.getElementById('explore-view');
    const postView = document.getElementById('post-view');
    
    const toggleViewModeBtn = document.getElementById('toggle-view-mode');
    const toggleSharedModeBtn = document.getElementById('toggle-shared-mode');
    const viewLikedPhotosBtn = document.getElementById('view-liked-photos');
    const dateFiltersContainer = document.getElementById('date-filters');
    const btnMapView = document.getElementById('btn-map-view');
    const btnGridView = document.getElementById('btn-grid-view');
    const galleryGrid = document.getElementById('gallery-grid');
    
    const backToExploreBtn = document.getElementById('back-to-explore');
    const collapseBtn = document.getElementById('collapse-btn');
    const photoViewerImg = document.getElementById('current-photo');
    const mainPhotoContainer = document.getElementById('main-photo-container');
    const mainLikeBtn = document.getElementById('main-like-btn');
    const likeCountText = document.getElementById('like-count-text');
    const photoDescriptionText = document.getElementById('photo-description');
    const postDateText = document.getElementById('post-date');
    const commentsList = document.getElementById('comments-list');
    const commentForm = document.getElementById('comment-form-elegant');
    const commentInput = document.getElementById('comment-input');
    const heartAnim = document.getElementById('heart-anim');
    const downloadBtn = document.getElementById('download-btn');
    const photoUploadInput = document.getElementById('photo-upload');
    const clearPhotosBtn = document.getElementById('clear-photos');
    const toggleRouteBtn = document.getElementById('toggle-route');

    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko', { 
        attribution: 'Google Maps',
        maxNativeZoom: 20,
        maxZoom: 21
    }).addTo(map);

    function toggleSidebar() {
        const isHidden = sidebar.classList.toggle('hidden');
        toggleSidebarBtn.textContent = isHidden ? '▶' : '◀';
        animateMapResize();
    }

    function expandSidebarForPost() {
        sidebar.classList.remove('hidden');
        sidebar.classList.add('expanded');
        exploreView.style.display = 'none';
        postView.style.display = 'flex';
        toggleSidebarBtn.textContent = '◀';
        animateMapResize();
    }

    function showExploreView() {
        sidebar.classList.remove('expanded');
        postView.style.display = 'none';
        exploreView.style.display = 'flex';
        currentSelectedPhoto = null;
        toggleSidebarBtn.textContent = '◀';
        animateMapResize();
    }

    function animateMapResize() {
        const start = performance.now();
        function step(now) {
            map.invalidateSize();
            if (now - start < 500) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    toggleSidebarBtn.addEventListener('click', toggleSidebar);
    backToExploreBtn.addEventListener('click', showExploreView);
    collapseBtn.addEventListener('click', () => {
        sidebar.classList.remove('expanded');
        animateMapResize();
    });

    map.on('click', () => {
        if (postView.style.display === 'flex' && sidebar.classList.contains('expanded')) {
            sidebar.classList.remove('expanded');
            animateMapResize();
        }
    });

    async function loadData() {
        const db = await dbPromise;
        photos = await db.getAll(photoStoreName);
        sharedPhotos = await db.getAll(sharedStoreName);
        photos.forEach(p => { if(!p.comments) p.comments = []; p.likes = p.likes || (p.liked ? 1 : 0); });
        sharedPhotos.forEach(p => { if(!p.comments) p.comments = []; p.likes = p.likes || (p.liked ? 1 : 0); });
        updateUI();
    }

    function updateUI(filterDate = 'all') {
        let targetList = viewMode === 'my' ? photos : sharedPhotos;
        if (showOnlyLiked) targetList = targetList.filter(p => p.liked);
        const filtered = targetList.filter(p => filterDate === 'all' || p.date === filterDate);

        markers.clearLayers();
        filtered.forEach(photo => {
            const marker = L.marker([photo.lat, photo.lng], { icon: heartIcon });
            marker.on('click', () => {
                selectPhoto(photo);
                expandSidebarForPost();
            });
            markers.addLayer(marker);
        });
        map.addLayer(markers);

        galleryGrid.innerHTML = '';
        filtered.forEach(photo => {
            const div = document.createElement('div');
            div.className = `grid-item`;
            div.innerHTML = `<img src="${photo.url}" loading="lazy">`;
            div.onclick = () => {
                map.setView([photo.lat, photo.lng], 18);
                selectPhoto(photo);
                expandSidebarForPost();
            };
            galleryGrid.appendChild(div);
        });

        setupDateFilters();
        
        toggleViewModeBtn.classList.toggle('active', viewMode === 'my');
        toggleSharedModeBtn.classList.toggle('active', viewMode === 'shared');
        viewLikedPhotosBtn.classList.toggle('active', showOnlyLiked);

        galleryGrid.style.display = gridMode ? 'grid' : 'none';
    }

    function selectPhoto(photo) {
        currentSelectedPhoto = photo;
        photoViewerImg.src = photo.url;
        photoDescriptionText.textContent = photo.description;
        postDateText.textContent = photo.date;
        downloadBtn.href = photo.url;
        
        mainLikeBtn.textContent = photo.liked ? '❤️' : '🤍';
        likeCountText.textContent = photo.likes || 0;
        
        renderComments();
    }

    function renderComments() {
        commentsList.innerHTML = '';
        if(!currentSelectedPhoto || !currentSelectedPhoto.comments) return;
        currentSelectedPhoto.comments.forEach(c => {
            const li = document.createElement('li');
            li.textContent = c;
            commentsList.appendChild(li);
        });
        commentsList.scrollTop = commentsList.scrollHeight;
    }

    async function toggleLike() {
        if (!currentSelectedPhoto) return;
        currentSelectedPhoto.liked = !currentSelectedPhoto.liked;
        currentSelectedPhoto.likes = currentSelectedPhoto.liked ? (currentSelectedPhoto.likes||0)+1 : Math.max((currentSelectedPhoto.likes||1)-1, 0);
        
        mainLikeBtn.textContent = currentSelectedPhoto.liked ? '❤️' : '🤍';
        likeCountText.textContent = currentSelectedPhoto.likes;
        
        if(currentSelectedPhoto.liked) {
            heartAnim.classList.add('animate');
            setTimeout(() => heartAnim.classList.remove('animate'), 600);
        }

        const storeName = viewMode === 'my' ? photoStoreName : sharedStoreName;
        const db = await dbPromise;
        await db.put(storeName, currentSelectedPhoto);
        if(showOnlyLiked) updateUI(); 
    }

    mainLikeBtn.addEventListener('click', toggleLike);
    
    let lastClick = 0;
    mainPhotoContainer.addEventListener('click', (e) => {
        const now = new Date().getTime();
        if (now - lastClick < 300) { toggleLike(); lastClick = 0; }
        else { lastClick = now; }
    });

    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentSelectedPhoto) return;
        const text = commentInput.value.trim();
        if (text) {
            if(!currentSelectedPhoto.comments) currentSelectedPhoto.comments = [];
            currentSelectedPhoto.comments.push(text);
            commentInput.value = '';
            const storeName = viewMode === 'my' ? photoStoreName : sharedStoreName;
            const db = await dbPromise;
            await db.put(storeName, currentSelectedPhoto);
            renderComments();
        }
    });

    toggleViewModeBtn.addEventListener('click', () => { viewMode = 'my'; showOnlyLiked = false; updateUI(); });
    toggleSharedModeBtn.addEventListener('click', () => { viewMode = 'shared'; showOnlyLiked = false; updateUI(); });
    viewLikedPhotosBtn.addEventListener('click', () => { showOnlyLiked = !showOnlyLiked; updateUI(); });

    btnMapView.addEventListener('click', () => { gridMode = false; btnMapView.classList.add('active'); btnGridView.classList.remove('active'); updateUI(); });
    btnGridView.addEventListener('click', () => { gridMode = true; btnGridView.classList.add('active'); btnMapView.classList.remove('active'); updateUI(); });

    function setupDateFilters() {
        const targetList = viewMode === 'my' ? photos : sharedPhotos;
        const uniqueDates = [...new Set(targetList.map(p => p.date))].sort((a,b)=>b.localeCompare(a));
        dateFiltersContainer.innerHTML = '<button class="filter-chip-elegant active" data-date="all">All Dates</button>';
        uniqueDates.forEach(date => {
            const btn = document.createElement('button');
            btn.className = 'filter-chip-elegant';
            btn.dataset.date = date;
            btn.textContent = date;
            dateFiltersContainer.appendChild(btn);
        });
    }

    dateFiltersContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-chip-elegant')) {
            document.querySelectorAll('.filter-chip-elegant').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            updateUI(e.target.dataset.date);
        }
    });

    toggleRouteBtn.addEventListener('click', () => {
        if (routeLine && map.hasLayer(routeLine)) {
            map.removeLayer(routeLine);
            toggleRouteBtn.classList.remove('active');
        } else {
            const currentPhotos = viewMode === 'my' ? photos : sharedPhotos;
            if (currentPhotos.length < 2) return alert('At least 2 photos needed for a path.');
            const routeCoords = currentPhotos.sort((a, b) => new Date(a.date) - new Date(b.date)).map(p => [p.lat, p.lng]);
            routeLine = L.polyline(routeCoords, { color: '#1a1a1a', weight: 2, opacity: 0.6, dashArray: '5, 10' }).addTo(map);
            toggleRouteBtn.classList.add('active');
            map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
        }
    });

    photoUploadInput.addEventListener('change', async (event) => {
        const files = event.target.files;
        if (!files.length) return;
        document.body.style.cursor = 'wait';
        
        const newPhotos = [];
        const photosWithoutGps = [];

        for (const file of Array.from(files)) {
            try {
                const exif = await exifr.parse(file);
                const dataUrl = await new Promise(r => {
                    const reader = new FileReader();
                    reader.onload = e => r(e.target.result);
                    reader.readAsDataURL(file);
                });

                const photoData = {
                    id: Date.now() + Math.random(),
                    url: dataUrl,
                    date: (exif?.DateTimeOriginal || exif?.CreateDate)?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
                    description: exif?.ImageDescription || file.name,
                    lat: exif?.latitude,
                    lng: exif?.longitude,
                    liked: false,
                    likes: 0,
                    comments: []
                };

                if (photoData.lat && photoData.lng) newPhotos.push(photoData);
                else photosWithoutGps.push(photoData);
            } catch (e) { console.error(e); }
        }

        if (newPhotos.length > 0) {
            await savePhotosToDB(newPhotos);
            photos.push(...newPhotos);
            viewMode = 'my';
            updateUI();
        }

        document.body.style.cursor = 'default';
        if (photosWithoutGps.length > 0) {
            if (confirm(`${photosWithoutGps.length} photos have no GPS. Pin them on the map?`)) {
                startLocationPicker(photosWithoutGps);
            }
        }
        event.target.value = null;
    });

    async function savePhotosToDB(newPhotos) {
        const db = await dbPromise;
        const tx = db.transaction(photoStoreName, 'readwrite');
        for (const p of newPhotos) {
            await tx.store.put(p);
        }
        await tx.done;
    }

    function startLocationPicker(remainingPhotos) {
        if (remainingPhotos.length === 0) {
            mapContainer.style.cursor = '';
            markers.options.interactive = true;
            // Re-enable individual markers interaction
            markers.eachLayer(m => m.options.interactive = true);
            return alert('All pins set.');
        }
        
        const pending = remainingPhotos.shift();
        mapContainer.style.cursor = 'crosshair';
        markers.options.interactive = false;
        // Disable individual markers interaction to ensure map click works everywhere
        markers.eachLayer(m => m.options.interactive = false);
        
        alert(`Click on the map to pin: "${pending.description}"`);
        
        map.once('click', async (e) => {
            pending.lat = e.latlng.lat;
            pending.lng = e.latlng.lng;
            await savePhotosToDB([pending]);
            photos.push(pending);
            updateUI();
            startLocationPicker(remainingPhotos);
        });
    }

    clearPhotosBtn.addEventListener('click', async () => {
        if (confirm('Permanently delete all your stories?')) {
            const db = await dbPromise;
            await db.clear(photoStoreName);
            photos = [];
            showExploreView();
            updateUI();
        }
    });

    loadData();
});