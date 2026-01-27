document.addEventListener('DOMContentLoaded', () => {
    let photos = [];
    const mapContainer = document.getElementById('map');
    const sidebar = document.getElementById('sidebar');
    const map = L.map(mapContainer).setView([36.2048, 138.2529], 5.5);
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
    const collapseBtn = document.getElementById('collapse-btn');

    // 1. 지도 타일 설정
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // 2. 사이드바 확장/축소 함수
    const originalSidebarWidth = '360px';
    const expandedSidebarWidth = '65vw';

    function expandSidebar() {
        if (sidebar.classList.contains('expanded')) return;
        sidebar.classList.add('expanded');
        mapContainer.style.right = expandedSidebarWidth;
        setTimeout(() => map.invalidateSize(), 250); // 애니메이션 중간에 맞춤
    }

    function collapseSidebar() {
        if (!sidebar.classList.contains('expanded')) return;
        sidebar.classList.remove('expanded');
        mapContainer.style.right = originalSidebarWidth;
        setTimeout(() => map.invalidateSize(), 250);
    }
    
    // 3. 핵심 UI 업데이트 함수
    function updateUI() {
        displayPhotos();
        setupDateFilters();
    }

    // 4. 사진 마커 생성 및 표시
    function displayPhotos(filterDate = 'all') {
        markers.clearLayers();
        const filteredPhotos = photos.filter(p => filterDate === 'all' || p.date === filterDate);

        filteredPhotos.forEach(photo => {
            const marker = L.marker([photo.lat, photo.lng]);
            marker.on('click', () => {
                photoViewerImg.src = photo.url;
                photoViewerDesc.textContent = photo.description;
                downloadBtn.href = photo.url;
                downloadBtn.download = `${photo.description.replace(/\\s+/g, '_') || 'photo'}.jpg`;
                expandSidebar();
            });
            markers.addLayer(marker);
        });
        map.addLayer(markers);
    }

    // 5. 날짜 필터 버튼 생성
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

    // 6. 사진 업로드 처리
    photoUploadInput.addEventListener('change', async (event) => {
        const files = event.target.files;
        if (!files.length) return;

        try {
            document.body.style.cursor = 'wait'; // 로딩 커서

            const photoPromises = Array.from(files).map(file => {
                return new Promise(async (resolve) => {
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
                            resolve(null);
                        }
                    } catch (e) {
                        console.error('Error processing file:', file.name, e);
                        resolve(null); // 오류 발생 시 해당 파일만 무시
                    }
                });
            });

            const newPhotos = (await Promise.all(photoPromises)).filter(p => p !== null);
            photos.push(...newPhotos);
            savePhotosToStorage();
            updateUI();
            
            alert(`총 ${files.length}개의 사진 중 GPS 정보가 확인된 ${newPhotos.length}개의 사진을 추가했습니다.`);

        } catch (error) {
            console.error("An unexpected error occurred during photo upload:", error);
            alert("사진을 올리는 중 예상치 못한 오류가 발생했습니다. 개발자 콘솔을 확인해주세요.");
        } finally {
            // 이 블록은 성공/실패 여부와 관계없이 항상 실행됩니다.
            document.body.style.cursor = 'default';
            event.target.value = null; // 입력 필드 초기화
        }
    });
    
    // 7. LocalStorage 관련 함수
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
    
    // 8. 모든 사진 지우기
    clearPhotosBtn.addEventListener('click', () => {
        if (confirm('정말로 모든 사진을 지우시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            photos = [];
            localStorage.removeItem('myTravelPhotos');
            updateUI();
            photoViewerImg.src = '';
            photoViewerDesc.textContent = '';
            downloadBtn.href = '#';
            collapseSidebar();
        }
    });

    // 9. 여행 경로 표시/숨기기
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

    // 10. 이벤트 리스너 연결
    dateFiltersContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            const selectedDate = e.target.dataset.date;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            displayPhotos(selectedDate);
        }
    });

    photoViewerImg.addEventListener('click', expandSidebar);
    collapseBtn.addEventListener('click', collapseSidebar);

    // 11. 초기화
    loadPhotosFromStorage();
});
