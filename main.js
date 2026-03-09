document.addEventListener('DOMContentLoaded', async () => {
    let photos = [];
    let sharedPhotos = [];
    let currentSelectedPhoto = null;
    const dbName = 'JapanTripDB';
    const photoStoreName = 'photos';
    const sharedStoreName = 'sharedPhotos';

    const dbPromise = idb.openDB(dbName, 2, { // Incremented DB version
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
    const mainMarkers = L.markerClusterGroup();
    const sharedMarkers = L.markerClusterGroup();
    let routeLine = null;

    // --- Custom Icon ---
    const heartIcon = L.divIcon({
        className: 'heart-icon',
        html: '❤️',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    // UI 요소 참조
    const photoViewer = document.getElementById('photo-viewer');
    const controls = document.getElementById('controls');
    const photoViewerImg = document.getElementById('current-photo');
    const photoViewerDesc = document.getElementById('photo-description');
    const dateFiltersContainer = document.getElementById('date-filters');
    const toggleRouteBtn = document.getElementById('toggle-route');
    const downloadBtn = document.getElementById('download-btn');
    const photoUploadInput = document.getElementById('photo-upload');
    const clearPhotosBtn = document.getElementById('clear-photos');
    const collapseBtn = document.getElementById('collapse-btn');
    const sharePhotoBtn = document.getElementById('share-photo-btn');
    const viewSharedPhotosBtn = document.getElementById('view-shared-photos-btn');
    const sharedPhotosContainer = document.getElementById('shared-photos-container');
    const backToMainBtn = document.getElementById('back-to-main-btn');
    const sharedPhotosList = document.getElementById('shared-photos-list');

    // --- Google Maps Tiles (Korean Labels) ---
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko', {
        attribution: '&copy; <a href="https://www.google.com/maps">Google Maps</a>'
    }).addTo(map);

    function expandSidebar() {
        if (sidebar.classList.contains('expanded')) return;
        sidebar.classList.remove('hidden'); // 확대 시 숨김 상태 해제
        sidebar.classList.add('expanded');
        toggleSidebarBtn.textContent = '▶';
        animateMapResize();
    }

    function collapseSidebar() {
        if (!sidebar.classList.contains('expanded')) return;
        sidebar.classList.remove('expanded');
        toggleSidebarBtn.textContent = '◀';
        animateMapResize();
        
        // 확대 해제 시 사진 뷰어 상태 초기화 (이미지 오류 방지)
        setTimeout(() => {
            if (!sidebar.classList.contains('expanded')) {
                photoViewerImg.src = '';
                photoViewerDesc.textContent = '';
                sharePhotoBtn.style.display = 'none';
                currentSelectedPhoto = null;
            }
        }, 500);
    }

    function toggleSidebar() {
        const isHidden = sidebar.classList.toggle('hidden');
        
        // 사이드바를 숨길 때 확대 상태도 함께 해제하여 레이아웃 충돌 방지
        if (isHidden && sidebar.classList.contains('expanded')) {
            sidebar.classList.remove('expanded');
        }
        
        updateToggleBtnText();
        animateMapResize();
    }

    function updateToggleBtnText() {
        const isHidden = sidebar.classList.contains('hidden');
        const isExpanded = sidebar.classList.contains('expanded');
        
        if (isHidden) {
            toggleSidebarBtn.textContent = '▶';
        } else if (isExpanded) {
            toggleSidebarBtn.textContent = '▶';
        } else {
            toggleSidebarBtn.textContent = '◀';
        }
    }

    // 지도 클릭 시 확대된 사이드바를 기본 크기로 복구
    map.on('click', () => {
        if (sidebar.classList.contains('expanded')) {
            collapseSidebar();
        }
    });

    // 애니메이션 시간(500ms) 동안 지도의 크기를 여러 번 업데이트하여 부드럽게 유지
    function animateMapResize() {
        const startTime = performance.now();
        const duration = 600; // CSS transition(500ms)보다 약간 길게 설정

        function step(currentTime) {
            const elapsed = currentTime - startTime;
            map.invalidateSize();
            if (elapsed < duration) {
                requestAnimationFrame(step);
            }
        }
        requestAnimationFrame(step);
    }

    toggleSidebarBtn.addEventListener('click', toggleSidebar);

    function updateUI() {
        displayPhotos();
        setupDateFilters();
    }

    function displayPhotos(filterDate = 'all') {
        mainMarkers.clearLayers();
        const filteredPhotos = photos.filter(p => filterDate === 'all' || p.date === filterDate);

        filteredPhotos.forEach(photo => {
            const marker = L.marker([photo.lat, photo.lng], { icon: heartIcon });
            marker.on('click', () => {
                currentSelectedPhoto = photo;
                photoViewerImg.src = photo.url;
                photoViewerDesc.textContent = photo.description;
                downloadBtn.href = photo.url;
                downloadBtn.download = `${photo.description.replace(/\\s+/g, '_') || 'photo'}.jpg`;
                sharePhotoBtn.style.display = 'block';
                viewSharedPhotosBtn.style.display = 'none';
                expandSidebar();
            });
            mainMarkers.addLayer(marker);
        });
        map.addLayer(mainMarkers);
    }

    function setupDateFilters() {
        dateFiltersContainer.innerHTML = '<button class="filter-btn active" data-date="all">모든 날짜</button>';
        const uniqueDates = [...new Set(photos.map(p => p.date))].sort();
        uniqueDates.forEach(date => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.date = date;
            btn.textContent = date;
            dateFiltersContainer.appendChild(btn);
        });
    }

    let isPickingLocation = false;
    let pendingPhoto = null;

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
                    lng: exif?.longitude
                };

                if (photoData.lat && photoData.lng) {
                    newPhotos.push(photoData);
                } else {
                    photosWithoutGps.push(photoData);
                }
            } catch (e) {
                console.error('Error processing file:', file.name, e);
            }
        }

        if (newPhotos.length > 0) {
            await savePhotosToDB(newPhotos);
            photos.push(...newPhotos);
            updateUI();
        }

        document.body.style.cursor = 'default';
        event.target.value = null;

        if (photosWithoutGps.length > 0) {
            if (confirm(`위치 정보가 없는 사진이 ${photosWithoutGps.length}장 있습니다. 지도에서 직접 위치를 지정하여 등록하시겠습니까?\n(확인을 누른 후 지도를 클릭해주세요.)`)) {
                // 첫 번째 사진부터 위치 지정 시작
                startLocationPicker(photosWithoutGps);
            } else {
                alert(`${newPhotos.length}개의 사진만 추가되었습니다.`);
            }
        } else if (newPhotos.length > 0) {
            alert(`총 ${newPhotos.length}개의 사진을 추가했습니다.`);
        }
    });

    function startLocationPicker(remainingPhotos) {
        if (remainingPhotos.length === 0) {
            isPickingLocation = false;
            mapContainer.style.cursor = '';
            alert('모든 사진의 위치 지정이 완료되었습니다.');
            return;
        }

        isPickingLocation = true;
        pendingPhoto = remainingPhotos.shift();
        const nextPhotos = remainingPhotos;

        mapContainer.style.cursor = 'crosshair';
        alert(`[위치 지정 모드] "${pendingPhoto.description}" 사진의 위치를 지도에서 클릭해주세요.`);

        // 기존 클릭 이벤트 제거 후 새로 등록 (한 번만 실행)
        map.once('click', async (e) => {
            if (!isPickingLocation || !pendingPhoto) return;

            const { lat, lng } = e.latlng;
            pendingPhoto.lat = lat;
            pendingPhoto.lng = lng;

            await savePhotosToDB([pendingPhoto]);
            photos.push(pendingPhoto);
            updateUI();

            // 다음 사진이 있다면 계속 진행
            startLocationPicker(nextPhotos);
        });
    }

    async function savePhotosToDB(newPhotos) {
        const db = await dbPromise;
        const tx = db.transaction(photoStoreName, 'readwrite');
        await Promise.all(newPhotos.map(photo => tx.store.add(photo)));
        await tx.done;
    }

    async function loadPhotosFromDB() {
        const db = await dbPromise;
        photos = await db.getAll(photoStoreName);
        updateUI();
    }

    async function saveSharedPhotoToDB(photo) {
        const db = await dbPromise;
        await db.put(sharedStoreName, photo);
    }

    async function loadSharedPhotosFromDB() {
        const db = await dbPromise;
        sharedPhotos = await db.getAll(sharedStoreName);
    }

    clearPhotosBtn.addEventListener('click', async () => {
        if (confirm('정말로 모든 사진을 지우시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            const db = await dbPromise;
            await db.clear(photoStoreName);
            photos = [];
            updateUI();
            photoViewerImg.src = '';
            photoViewerDesc.textContent = '';
            downloadBtn.href = '#';
            collapseSidebar();
        }
    });

    toggleRouteBtn.addEventListener('click', () => {
        if (routeLine && map.hasLayer(routeLine)) {
            map.removeLayer(routeLine);
            toggleRouteBtn.classList.remove('active');
        } else {
            if (photos.length < 2) return alert('경로를 그리려면 2장 이상의 사진이 필요합니다.');
            const routeCoords = photos.sort((a, b) => new Date(a.date) - new Date(b.date)).map(p => [p.lat, p.lng]);
            routeLine = L.polyline(routeCoords, { color: 'blue', weight: 3 }).addTo(map);
            toggleRouteBtn.classList.add('active');
            map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
        }
    });

    dateFiltersContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            displayPhotos(e.target.dataset.date);
        }
    });

    photoViewerImg.addEventListener('click', expandSidebar);
    collapseBtn.addEventListener('click', () => {
        collapseSidebar();
        viewSharedPhotosBtn.style.display = 'block';
    });

    function renderSharedMarkers() {
        sharedMarkers.clearLayers();
        sharedPhotos.forEach(photo => {
            const marker = L.marker([photo.lat, photo.lng], { icon: heartIcon })
                .bindPopup(`<b>${photo.description}</b>`);
            photo.marker = marker; // Store marker reference
            sharedMarkers.addLayer(marker);
        });
    }

    function renderSharedPhotos() {
        sharedPhotosList.innerHTML = '';
        if (sharedPhotos.length === 0) {
            sharedPhotosList.innerHTML = '<p style="text-align: center; color: #8c7b70;">아직 공유된 사진이 없습니다.</p>';
            return;
        }
        sharedPhotos.forEach(photo => {
            const item = document.createElement('div');
            item.className = 'shared-photo-item';
            item.dataset.id = photo.id;
            item.innerHTML = `
                <img src="${photo.url}" alt="${photo.description}">
                <p>${photo.description}</p>
                <div class="shared-photo-actions">
                    <button class="like-btn ${photo.liked ? 'liked' : ''}" data-id="${photo.id}">${photo.liked ? '❤️' : '♡'} 좋아요 ${photo.likes}</button>
                </div>
                <div class="comments-container">
                    <ul class="comments-list">${photo.comments.map(c => `<li>${c}</li>`).join('')}</ul>
                    <form class="comment-form" data-id="${photo.id}"><input type="text" placeholder="댓글 달기..." required><button type="submit">등록</button></form>
                </div>`;
            sharedPhotosList.appendChild(item);
        });
    }

    function showSharedPhotosView() {
        photoViewer.style.display = 'none';
        controls.style.display = 'none';
        sharedPhotosContainer.style.display = 'block';
        map.removeLayer(mainMarkers);
        renderSharedMarkers();
        map.addLayer(sharedMarkers);
        if (sharedPhotos.length > 0) {
             map.fitBounds(sharedMarkers.getBounds(), { padding: [50, 50] });
        }
        renderSharedPhotos();
    }

    function showMainView() {
        photoViewer.style.display = 'block';
        controls.style.display = 'block';
        sharedPhotosContainer.style.display = 'none';
        map.removeLayer(sharedMarkers);
        map.addLayer(mainMarkers);
        viewSharedPhotosBtn.style.display = 'block';
        if (photos.length > 0) {
            map.fitBounds(mainMarkers.getBounds(), { padding: [50, 50] });
        }
    }

    sharePhotoBtn.addEventListener('click', async () => {
        if (!currentSelectedPhoto) return;
        if (sharedPhotos.some(p => p.url === currentSelectedPhoto.url)) {
            alert('이미 공유된 사진입니다.');
            return;
        }
        const newSharedPhoto = {
            id: Date.now(),
            url: currentSelectedPhoto.url,
            description: currentSelectedPhoto.description,
            lat: currentSelectedPhoto.lat,
            lng: currentSelectedPhoto.lng,
            likes: 0,
            liked: false,
            comments: []
        };
        sharedPhotos.push(newSharedPhoto);
        await saveSharedPhotoToDB(newSharedPhoto);
        sharePhotoBtn.style.display = 'none';
        currentSelectedPhoto = null;
        showSharedPhotosView(); // Switch to shared view
    });

    viewSharedPhotosBtn.addEventListener('click', showSharedPhotosView);
    backToMainBtn.addEventListener('click', showMainView);

    sharedPhotosList.addEventListener('click', async (e) => {
        const photoId = parseInt(e.target.dataset.id);
        if (e.target.classList.contains('like-btn')) {
            const photo = sharedPhotos.find(p => p.id === photoId);
            if (photo) {
                photo.liked ? photo.likes-- : photo.likes++;
                photo.liked = !photo.liked;
                await saveSharedPhotoToDB(photo);
                renderSharedPhotos();
            }
        } else if (e.target.closest('.shared-photo-item')) {
            const item = e.target.closest('.shared-photo-item');
            const clickedId = parseInt(item.dataset.id);
            const photo = sharedPhotos.find(p => p.id === clickedId);
            if (photo && photo.marker) {
                map.setView([photo.lat, photo.lng], 17);
                photo.marker.openPopup();
            }
        }
    });

    sharedPhotosList.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (e.target.classList.contains('comment-form')) {
            const photoId = parseInt(e.target.dataset.id);
            const input = e.target.querySelector('input');
            const commentText = input.value.trim();
            if (commentText) {
                const photo = sharedPhotos.find(p => p.id === photoId);
                if (photo) {
                    photo.comments.push(commentText);
                    input.value = '';
                    await saveSharedPhotoToDB(photo);
                    renderSharedPhotos();
                }
            }
        }
    });

    await loadPhotosFromDB();
    await loadSharedPhotosFromDB();
});