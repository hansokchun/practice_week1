document.addEventListener('DOMContentLoaded', () => {
    let photos = [];
    const map = L.map('map').setView([36.2048, 138.2529], 5.5);
    const markers = L.markerClusterGroup();
    let routeLine = null;

    // UI 요소 참조
    const photoViewerImg = document.getElementById('current-photo');
    const photoViewerDesc = document.getElementById('photo-description');
    const dateFiltersContainer = document.getElementById('date-filters');
    const toggleRouteBtn = document.getElementById('toggle-route');
    const downloadBtn = document.getElementById('download-btn');
    const photoUploadInput = document.getElementById('photo-upload');
    const clearPhotosBtn = document.getElementById('clear-photos');

    let currentObjectUrl = null;

    // 1. 지도 타일 변경 (더 빠른 기본 OpenStreetMap 타일)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 2. 핵심 UI 업데이트 함수
    function updateUI() {
        displayPhotos();
        setupDateFilters();
    }

    // 3. 사진 마커 생성 및 표시
    function displayPhotos(filterDate = 'all') {
        markers.clearLayers();
        const filteredPhotos = photos.filter(p => filterDate === 'all' || p.date === filterDate);

        filteredPhotos.forEach(photo => {
            const marker = L.marker([photo.lat, photo.lng]);
            marker.on('click', () => {
                photoViewerImg.src = photo.url;
                photoViewerDesc.textContent = photo.description;
                downloadBtn.href = photo.url; // Data URL은 바로 다운로드 가능
                downloadBtn.download = `${photo.description.replace(/\s+/g, '_') || 'photo'}.jpg`;
            });
            markers.addLayer(marker);
        });
        map.addLayer(markers);
    }

    // 4. 날짜 필터 버튼 생성 및 이벤트 처리
    function setupDateFilters() {
        dateFiltersContainer.innerHTML = '<button class="filter-btn active" data-date="all">모든 날짜</button>'; // 초기화
        const uniqueDates = [...new Set(photos.map(p => p.date))].sort();
        uniqueDates.forEach(date => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.date = date;
            btn.textContent = date;
            dateFiltersContainer.appendChild(btn);
        });
    }

    // 5. 사진 업로드 처리
    photoUploadInput.addEventListener('change', async (event) => {
        const files = event.target.files;
        if (!files.length) return;

        const photoPromises = Array.from(files).map(file => {
            return new Promise(async (resolve, reject) => {
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
                    } else {
                        resolve(null); // 위치 정보 없는 사진은 무시
                    }
                } catch (e) {
                    console.error('Error processing file:', file.name, e);
                    reject(e);
                }
            });
        });
        
        const newPhotos = (await Promise.all(photoPromises)).filter(p => p !== null);
        photos.push(...newPhotos);
        savePhotosToStorage();
        updateUI();
        alert(`${newPhotos.length}개의 사진이 추가되었습니다.`);
    });
    
    // 6. LocalStorage 관련 함수
    function savePhotosToStorage() {
        localStorage.setItem('myTravelPhotos', JSON.stringify(photos));
    }

    function loadPhotosFromStorage() {
        const storedPhotos = localStorage.getItem('myTravelPhotos');
        if (storedPhotos) {
            photos = JSON.parse(storedPhotos);
            updateUI();
        }
    }
    
    // 7. 모든 사진 지우기
    clearPhotosBtn.addEventListener('click', () => {
        if (confirm('정말로 모든 사진을 지우시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            photos = [];
            localStorage.removeItem('myTravelPhotos');
            updateUI();
            // 화면 초기화
            photoViewerImg.src = '';
            photoViewerDesc.textContent = '';
            downloadBtn.href = '#';
        }
    });

    // 8. 여행 경로 표시/숨기기
    toggleRouteBtn.addEventListener('click', () => {
        if (routeLine && map.hasLayer(routeLine)) {
            map.removeLayer(routeLine);
            toggleRouteBtn.classList.remove('active');
            toggleRouteBtn.textContent = '여행 경로 보기';
        } else {
            if (photos.length < 2) {
                alert('경로를 그리려면 2장 이상의 사진이 필요합니다.');
                return;
            }
            const routeCoords = photos.sort((a, b) => new Date(a.date) - new Date(b.date)).map(p => [p.lat, p.lng]);
            routeLine = L.polyline(routeCoords, { color: 'blue', weight: 3 });
            map.addLayer(routeLine);
            toggleRouteBtn.classList.add('active');
            toggleRouteBtn.textContent = '여행 경로 숨기기';
            map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
        }
    });

    // 9. 날짜 필터 위임 이벤트
    dateFiltersContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            const selectedDate = e.target.dataset.date;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            displayPhotos(selectedDate);
        }
    });

    // 10. 초기화
    loadPhotosFromStorage();
});