document.addEventListener('DOMContentLoaded', () => {
    // 1. 샘플 사진 데이터 (사용자 사진이 없을 경우 사용)
    const samplePhotos = [
        {
            lat: 35.6895,
            lng: 139.6917,
            date: '2023-10-20',
            url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=2070&auto=format&fit=crop',
            description: '도쿄의 번화한 시부야 교차로'
        },
        // ... (rest of the sample photos)
    ];

    // myPhotos가 정의되어 있고 비어있지 않으면 사용자 사진을, 그렇지 않으면 샘플 사진을 사용
    const photos = (typeof myPhotos !== 'undefined' && myPhotos.length > 0) ? myPhotos : samplePhotos;
    
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
    const downloadBtn = document.getElementById('download-btn');
    let currentObjectUrl = null;

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

                // 다운로드 링크 설정 (CORS 이슈 해결)
                if (currentObjectUrl) {
                    URL.revokeObjectURL(currentObjectUrl); // 이전 URL 해제
                }
                
                photoViewerImg.style.opacity = '0.5'; // 로딩 표시

                fetch(photo.url)
                    .then(response => response.blob())
                    .then(blob => {
                        currentObjectUrl = URL.createObjectURL(blob);
                        downloadBtn.href = currentObjectUrl;
                        const fileName = photo.description.replace(/\\s+/g, '_') || 'photo';
                        downloadBtn.download = `${fileName}.jpg`;
                        photoViewerImg.style.opacity = '1'; // 로딩 완료
                    })
                    .catch(e => {
                        console.error('다운로드 링크 생성 실패:', e);
                        photoViewerImg.style.opacity = '1';
                    });
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
