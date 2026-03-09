document.addEventListener('DOMContentLoaded', async () => {
    let photos = [];
    let sharedPhotos = [];
    let currentSelectedPhoto = null;
    let viewMode = 'my'; // 'my' 또는 'shared'
    let showOnlyLiked = false;

    const dbName = 'JapanTripDB';
    const photoStoreName = 'photos';
    const sharedStoreName = 'sharedPhotos';

    const dbPromise = idb.openDB(dbName, 2, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(photoStoreName)) {
                db.createObjectStore(photoStoreName, { autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(sharedStoreName)) {
                db.createObjectStore(sharedStoreName, { keyPath: 'id' });
            }
        },
    });

    const mapContainer = document.getElementById('map');
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const map = L.map(mapContainer).setView([36.2048, 138.2529], 5.5);
    const markers = L.markerClusterGroup();
    let routeLine = null;

    const heartIcon = L.divIcon({
        className: 'heart-icon',
        html: '❤️',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    // UI 요소 참조
    const photoViewerImg = document.getElementById('current-photo');
    const photoViewerDesc = document.getElementById('photo-description');
    const mainLikeBtn = document.getElementById('main-like-btn');
    const dateFiltersContainer = document.getElementById('date-filters');
    const toggleRouteBtn = document.getElementById('toggle-route');
    const downloadBtn = document.getElementById('download-btn');
    const photoUploadInput = document.getElementById('photo-upload');
    const clearPhotosBtn = document.getElementById('clear-photos');
    const collapseBtn = document.getElementById('collapse-btn');
    const sharePhotoBtn = document.getElementById('share-photo-btn');
    const toggleViewModeBtn = document.getElementById('toggle-view-mode');
    const viewLikedPhotosBtn = document.getElementById('view-liked-photos');

    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko', {
        attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>'
    }).addTo(map);

    function expandSidebar() {
        if (sidebar.classList.contains('expanded')) return;
        sidebar.classList.remove('hidden');
        sidebar.classList.add('expanded');
        animateMapResize();
    }

    function collapseSidebar() {
        if (!sidebar.classList.contains('expanded')) return;
        sidebar.classList.remove('expanded');
        animateMapResize();
    }

    function toggleSidebar() {
        const isHidden = sidebar.classList.toggle('hidden');
        if (isHidden && sidebar.classList.contains('expanded')) {
            sidebar.classList.remove('expanded');
        }
        animateMapResize();
    }

    function animateMapResize() {
        const startTime = performance.now();
        const duration = 600;
        function step(currentTime) {
            const elapsed = currentTime - startTime;
            map.invalidateSize();
            if (elapsed < duration) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function updateUI() {
        displayMarkers();
        setupDateFilters();
        updateToggleButtons();
    }

    function displayMarkers(filterDate = 'all') {
        markers.clearLayers();
        let targetList = (viewMode === 'my') ? photos : sharedPhotos;
        
        if (showOnlyLiked) {
            targetList = targetList.filter(p => p.liked);
        }

        const filtered = targetList.filter(p => filterDate === 'all' || p.date === filterDate);

        filtered.forEach(photo => {
            const marker = L.marker([photo.lat, photo.lng], { icon: heartIcon });
            marker.on('click', () => {
                selectPhoto(photo);
                expandSidebar();
            });
            markers.addLayer(marker);
        });
        map.addLayer(markers);
    }

    function selectPhoto(photo) {
        currentSelectedPhoto = photo;
        photoViewerImg.src = photo.url;
        photoViewerDesc.textContent = photo.description;
        downloadBtn.href = photo.url;
        downloadBtn.download = `${photo.description.replace(/\s+/g, '_') || 'photo'}.jpg`;
        
        // 좋아요 상태 반영
        if (photo.liked) mainLikeBtn.classList.add('liked');
        else mainLikeBtn.classList.remove('liked');
        
        // 내 사진일 때만 공유하기 버튼 표시
        sharePhotoBtn.style.display = (viewMode === 'my') ? 'block' : 'none';
    }

    function setupDateFilters() {
        dateFiltersContainer.innerHTML = '<button class="filter-btn active" data-date="all">모든 날짜</button>';
        const targetList = (viewMode === 'my') ? photos : sharedPhotos;
        const uniqueDates = [...new Set(targetList.map(p => p.date))].sort();
        uniqueDates.forEach(date => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.date = date;
            btn.textContent = date;
            dateFiltersContainer.appendChild(btn);
        });
    }

    function updateToggleButtons() {
        toggleViewModeBtn.textContent = (viewMode === 'my') ? '다른 사람 사진 보기' : '내 사진 보기';
        viewLikedPhotosBtn.classList.toggle('active', showOnlyLiked);
    }

    // 사진 좋아요 처리
    mainLikeBtn.addEventListener('click', async () => {
        if (!currentSelectedPhoto) return;
        
        currentSelectedPhoto.liked = !currentSelectedPhoto.liked;
        mainLikeBtn.classList.toggle('liked', currentSelectedPhoto.liked);
        
        const storeName = (viewMode === 'my') ? photoStoreName : sharedStoreName;
        const db = await dbPromise;
        
        if (viewMode === 'my') {
            // photos 배열 내 객체 업데이트 및 DB 저장 (ID가 있는 경우 put 사용을 위해 구조 조정 필요할 수 있음)
            // 여기서는 단순화를 위해 전체 업데이트 또는 해당 객체만 업데이트
            await db.put(storeName, currentSelectedPhoto);
        } else {
            await db.put(storeName, currentSelectedPhoto);
        }
        
        if (showOnlyLiked) displayMarkers(); // 좋아요 모드일 경우 즉시 갱신
    });

    // 뷰 모드 토글
    toggleViewModeBtn.addEventListener('click', () => {
        viewMode = (viewMode === 'my') ? 'shared' : 'my';
        showOnlyLiked = false; // 모드 전환 시 좋아요 필터 해제
        updateUI();
    });

    // 좋아요 누른 사진만 보기 토글
    viewLikedPhotosBtn.addEventListener('click', () => {
        showOnlyLiked = !showOnlyLiked;
        updateUI();
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
                    url: dataUrl,
                    date: (exif?.DateTimeOriginal || exif?.CreateDate)?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
                    description: exif?.ImageDescription || file.name,
                    lat: exif?.latitude,
                    lng: exif?.longitude,
                    liked: false
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
            const id = await tx.store.add(p);
            p.id = id; // 할당된 ID 저장 (좋아요 업데이트용)
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
        if (confirm('정말로 모든 내 사진을 지우시겠습니까?')) {
            const db = await dbPromise;
            await db.clear(photoStoreName);
            photos = [];
            updateUI();
        }
    });

    toggleSidebarBtn.addEventListener('click', toggleSidebar);
    collapseBtn.addEventListener('click', collapseSidebar);
    map.on('click', () => { if (sidebar.classList.contains('expanded')) collapseSidebar(); });

    dateFiltersContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            displayMarkers(e.target.dataset.date);
        }
    });

    // 데이터 초기 로드
    const db = await dbPromise;
    photos = await db.getAll(photoStoreName);
    sharedPhotos = await db.getAll(sharedStoreName);
    updateUI();
});