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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    function expandSidebar() {
        if (sidebar.classList.contains('expanded')) return;
        sidebar.classList.add('expanded');
        mapContainer.style.right = '65vw';
        setTimeout(() => map.invalidateSize(), 250);
    }

    function collapseSidebar() {
        if (!sidebar.classList.contains('expanded')) return;
        sidebar.classList.remove('expanded');
        mapContainer.style.right = '360px';
        setTimeout(() => map.invalidateSize(), 250);
        sharePhotoBtn.style.display = 'none';
        currentSelectedPhoto = null;
    }

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

    photoUploadInput.addEventListener('change', async (event) => {
        const files = event.target.files;
        if (!files.length) return;
        document.body.style.cursor = 'wait';
        const photoPromises = Array.from(files).map(file => new Promise(async (resolve) => {
            try {
                const exif = await exifr.parse(file);
                const dataUrl = await new Promise(r => {
                    const reader = new FileReader();
                    reader.onload = e => r(e.target.result);
                    reader.readAsDataURL(file);
                });
                if (exif && exif.latitude && exif.longitude) {
                    resolve({
                        lat: exif.latitude,
                        lng: exif.longitude,
                        date: (exif.DateTimeOriginal || exif.CreateDate)?.toISOString().split('T')[0] || '날짜 없음',
                        url: dataUrl,
                        description: exif.ImageDescription || file.name
                    });
                } else { resolve(null); }
            } catch (e) {
                console.error('Error processing file:', file.name, e);
                resolve(null);
            }
        }));
        const newPhotos = (await Promise.all(photoPromises)).filter(p => p !== null);
        if (newPhotos.length > 0) {
            await savePhotosToDB(newPhotos);
            photos.push(...newPhotos);
            updateUI();
        }
        alert(`총 ${files.length}개의 사진 중 GPS 정보가 확인된 ${newPhotos.length}개의 사진을 추가했습니다.`);
        document.body.style.cursor = 'default';
        event.target.value = null;
    });

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