document.addEventListener('DOMContentLoaded', () => {
    // 1. 샘플 사진 데이터 (나중에 실제 데이터로 교체)
    const photos = [
        {
            lat: 35.6895,
            lng: 139.6917,
            date: '2023-10-20',
            url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=2070&auto=format&fit=crop',
            description: '도쿄의 번화한 시부야 교차로'
        },
        {
            lat: 35.6895,
            lng: 139.6917,
            date: '2023-10-20',
            url: 'https://images.unsplash.com/photo-1536098561742-ca998e48cb3a?q=80&w=1935&auto=format&fit=crop',
            description: '도쿄 타워의 야경'
        },
        {
            lat: 34.6937,
            lng: 135.5023,
            date: '2023-10-22',
            url: 'https://images.unsplash.com/photo-1559539356-2b41b8a4a4aw?q=80&w=1935&auto=format&fit=crop',
            description: '오사카 성의 웅장한 모습'
        },
        {
            lat: 35.0116,
            lng: 135.7681,
            date: '2023-10-24',
            url: 'https://images.unsplash.com/photo-1589216532426-993433535492?q=80&w=2070&auto=format&fit=crop',
            description: '교토의 금각사 (킨카쿠지)'
        },
        {
            lat: 35.0116,
            lng: 135.7681,
            date: '2023-10-24',
            url: 'https://images.unsplash.com/photo-1533224169251-5b80145f269a?q=80&w=2070&auto=format&fit=crop',
            description: '후시미 이나리 신사의 붉은 토리이 길'
        },
        {
            lat: 33.5904,
            lng: 130.4017,
            date: '2023-10-26',
            url: 'https://images.unsplash.com/photo-1582244458037-3f30d34a5d89?q=80&w=1935&auto=format&fit=crop',
            description: '후쿠오카의 현대적인 도시 풍경'
        }
    ];

    // 2. 지도 초기화
    const map = L.map('map').setView([36.2048, 138.2529], 5.5); // 일본 전체가 보이도록 초기 뷰 설정
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const markers = L.markerClusterGroup();
    let photoLayer = L.layerGroup();
    let routeLine = null;

    // UI 요소 참조
    const photoViewerImg = document.getElementById('current-photo');
    const photoViewerDesc = document.getElementById('photo-description');
    const dateFiltersContainer = document.getElementById('date-filters');
    const toggleRouteBtn = document.getElementById('toggle-route');

    // 3. 사진 마커 생성 및 표시
    function displayPhotos(filterDate = 'all') {
        markers.clearLayers();
        photoLayer.clearLayers();

        const filteredPhotos = photos.filter(p => filterDate === 'all' || p.date === filterDate);

        filteredPhotos.forEach(photo => {
            const marker = L.marker([photo.lat, photo.lng]);
            marker.on('click', () => {
                photoViewerImg.src = photo.url;
                photoViewerDesc.textContent = photo.description;
            });
            markers.addLayer(marker);
        });
        
        map.addLayer(markers);
        photoLayer = L.layerGroup(filteredPhotos.map(p => L.marker([p.lat, p.lng])));
    }

    // 4. 여행 경로 표시/숨기기
    function toggleRoute() {
        if (routeLine && map.hasLayer(routeLine)) {
            map.removeLayer(routeLine);
            toggleRouteBtn.classList.remove('active');
            toggleRouteBtn.textContent = '여행 경로 보기';
        } else {
            const routeCoords = photos.sort((a, b) => new Date(a.date) - new Date(b.date)).map(p => [p.lat, p.lng]);
            routeLine = L.polyline(routeCoords, { color: 'blue', weight: 3 });
            map.addLayer(routeLine);
            toggleRouteBtn.classList.add('active');
            toggleRouteBtn.textContent = '여행 경로 숨기기';
            map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
        }
    }

    // 5. 날짜 필터 버튼 생성 및 이벤트 처리
    function setupDateFilters() {
        const uniqueDates = [...new Set(photos.map(p => p.date))].sort();
        uniqueDates.forEach(date => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.date = date;
            btn.textContent = date;
            dateFiltersContainer.appendChild(btn);
        });
        
        dateFiltersContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                const selectedDate = e.target.dataset.date;
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                displayPhotos(selectedDate);
            }
        });
    }

    // 6. 초기화
    setupDateFilters();
    displayPhotos();
    toggleRouteBtn.addEventListener('click', toggleRoute);
});
