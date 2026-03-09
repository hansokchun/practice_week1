document.addEventListener('DOMContentLoaded', async () => {
    let photos = [];
    let sharedPhotos = [];
    let currentSelectedPhoto = null;
    let viewMode = 'my'; // 'my' or 'shared'
    let showOnlyLiked = false;
    let gridMode = false;

    const dbName = 'JapanTripDB';
    const photoStoreName = 'photos';
    const sharedStoreName = 'sharedPhotos';

    const dbPromise = idb.openDB(dbName, 3, {
        upgrade(db, oldVersion) {
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
    const map = L.map(mapContainer, {zoomControl: false}).setView([36.2048, 138.2529], 5.5);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    
    let routeLine = null;

    const heartIcon = L.divIcon({ className: 'heart-icon', html: '❤️', iconSize: [24, 24], iconAnchor: [12, 12] });
    const markers = L.markerClusterGroup({
        iconCreateFunction: function(cluster) {
            return L.divIcon({ html: `<b>${cluster.getChildCount()}</b>`, className: 'cluster-icon', iconSize: L.point(32, 32) });
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
    const photoDescription = document.getElementById('photo-description');
    const postDate = document.getElementById('post-date');
    const commentsList = document.getElementById('comments-list');
    const commentForm = document.getElementById('comment-form');
    const commentInput = document.getElementById('comment-input');
    const heartAnim = document.getElementById('heart-anim');
    const downloadBtn = document.getElementById('download-btn');
    const photoUploadInput = document.getElementById('photo-upload');
    const clearPhotosBtn = document.getElementById('clear-photos');
    const toggleRouteBtn = document.getElementById('toggle-route');

    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko', { attribution: 'Google Maps' }).addTo(map);

    function toggleSidebar() {
        sidebar.classList.toggle('hidden');
        animateMapResize();
    }

    function expandSidebarForPost() {
        sidebar.classList.remove('hidden');
        sidebar.classList.add('expanded');
        exploreView.style.display = 'none';
        postView.style.display = 'flex';
        animateMapResize();
    }

    function showExploreView() {
        sidebar.classList.remove('expanded');
        postView.style.display = 'none';
        exploreView.style.display = 'flex';
        currentSelectedPhoto = null;
        animateMapResize();
    }

    function animateMapResize() {
        const start = performance.now();
        function step(now) {
            map.invalidateSize();
            if (now - start < 450) requestAnimationFrame(step);
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
        // Ensure properties exist
        photos.forEach(p => { if(!p.comments) p.comments = []; p.likes = p.likes || (p.liked ? 1 : 0); });
        sharedPhotos.forEach(p => { if(!p.comments) p.comments = []; p.likes = p.likes || (p.liked ? 1 : 0); });
        updateUI();
    }

    function updateUI(filterDate = 'all') {
        let targetList = viewMode === 'my' ? photos : sharedPhotos;
        if (showOnlyLiked) targetList = targetList.filter(p => p.liked);
        const filtered = targetList.filter(p => filterDate === 'all' || p.date === filterDate);

        // Update Markers
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

        // Update Gallery
        galleryGrid.innerHTML = '';
        filtered.forEach(photo => {
            const div = document.createElement('div');
            div.className = `grid-item ${photo.liked ? 'liked' : ''}`;
            div.innerHTML = `<img src="${photo.url}" loading="lazy">`;
            div.onclick = () => {
                map.setView([photo.lat, photo.lng], 16);
                selectPhoto(photo);
                expandSidebarForPost();
            };
            galleryGrid.appendChild(div);
        });

        setupDateFilters();
        
        toggleViewModeBtn.classList.toggle('active', viewMode === 'my');
        toggleSharedModeBtn.classList.toggle('active', viewMode === 'shared');
        viewLikedPhotosBtn.classList.toggle('active', showOnlyLiked);

        if(gridMode) {
            galleryGrid.style.display = 'grid';
        } else {
            galleryGrid.style.display = 'none';
        }
    }

    function selectPhoto(photo) {
        currentSelectedPhoto = photo;
        photoViewerImg.src = photo.url;
        photoDescription.textContent = photo.description;
        postDate.textContent = photo.date;
        downloadBtn.href = photo.url;
        downloadBtn.download = `photo_${photo.date}.jpg`;
        
        mainLikeBtn.textContent = photo.liked ? '❤️' : '🤍';
        mainLikeBtn.classList.toggle('liked', photo.liked);
        likeCountText.textContent = photo.likes || (photo.liked ? 1 : 0);
        
        renderComments();
    }

    function renderComments() {
        commentsList.innerHTML = '';
        if(!currentSelectedPhoto || !currentSelectedPhoto.comments) return;
        currentSelectedPhoto.comments.forEach(c => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="comment-user">User</span> <span>${c}</span>`;
            commentsList.appendChild(li);
        });
        commentsList.scrollTop = commentsList.scrollHeight;
    }

    async function toggleLike() {
        if (!currentSelectedPhoto) return;
        currentSelectedPhoto.liked = !currentSelectedPhoto.liked;
        currentSelectedPhoto.likes = currentSelectedPhoto.liked ? Math.max((currentSelectedPhoto.likes||0)+1, 1) : Math.max((currentSelectedPhoto.likes||1)-1, 0);
        
        mainLikeBtn.textContent = currentSelectedPhoto.liked ? '❤️' : '🤍';
        mainLikeBtn.classList.toggle('liked', currentSelectedPhoto.liked);
        likeCountText.textContent = currentSelectedPhoto.likes;
        
        if(currentSelectedPhoto.liked) {
            heartAnim.classList.add('animate');
            setTimeout(() => heartAnim.classList.remove('animate'), 600);
        }

        const storeName = viewMode === 'my' ? photoStoreName : sharedStoreName;
        const db = await dbPromise;
        await db.put(storeName, currentSelectedPhoto);
        
        // Refresh grid icons if needed without full re-render
        if(gridMode || showOnlyLiked) updateUI(); 
    }

    mainLikeBtn.addEventListener('click', toggleLike);
    
    // Double click image to like (Instagram style)
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
        dateFiltersContainer.innerHTML = '<button class="filter-chip active" data-date="all">전체 일정</button>';
        uniqueDates.forEach(date => {
            const btn = document.createElement('button');
            btn.className = 'filter-chip';
            btn.dataset.date = date;
            btn.textContent = date;
            dateFiltersContainer.appendChild(btn);
        });
    }

    dateFiltersContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-chip')) {
            document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
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
            if (currentPhotos.length < 2) return alert('경로를 그리려면 2장 이상의 사진이 필요합니다.');
            const routeCoords = currentPhotos.sort((a, b) => new Date(a.date) - new Date(b.date)).map(p => [p.lat, p.lng]);
            routeLine = L.polyline(routeCoords, { color: '#0095F6', weight: 4, opacity: 0.8 }).addTo(map);
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
            if (confirm(`위치 정보가 없는 사진이 ${photosWithoutGps.length}장 있습니다. 직접 지정하시겠습니까?`)) {
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
        if (remainingPhotos.length === 0) return alert('완료되었습니다.');
        const pending = remainingPhotos.shift();
        mapContainer.style.cursor = 'crosshair';
        alert(`"${pending.description}"의 위치를 클릭해주세요.`);
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
        if (confirm('정말로 모든 내 데이터를 지우시겠습니까?')) {
            const db = await dbPromise;
            await db.clear(photoStoreName);
            photos = [];
            showExploreView();
            updateUI();
        }
    });
    
    // Custom style for clustering to fit new UI
    const style = document.createElement('style');
    style.innerHTML = `
        .cluster-icon {
            background: rgba(237, 73, 86, 0.95);
            color: white;
            border-radius: 50%;
            text-align: center;
            line-height: 32px;
            box-shadow: 0 4px 12px rgba(237, 73, 86, 0.4);
            font-family: Pretendard, sans-serif;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);

    loadData();
});