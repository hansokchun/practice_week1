/**
 * map.js — §4 Leaflet 지도 초기화, 클러스터 그룹, Google Places 검색
 */

/** Leaflet 지도와 클러스터 그룹을 초기화하고 반환 */
export function initMap(state, ui) {
    const map = L.map('map', { 
        zoomControl: false, 
        maxZoom: 19, 
        minZoom: 5
    }).setView([36.5, 127.5], 5);

    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ko', { 
        attribution: 'Google Maps', maxZoom: 19, minZoom: 5
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // 장소 검색 컨트롤 (Google Places API)
    const SearchControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function () {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control custom-google-search-control');
            const input = L.DomUtil.create('input', 'google-search-input', container);
            input.type = 'text';
            input.placeholder = '장소, 상호명 검색...';

            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            const initAutocomplete = () => {
                if (window.google && google.maps && google.maps.places) {
                    const autocomplete = new google.maps.places.Autocomplete(input);
                    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
                    autocomplete.addListener('place_changed', function() {
                        const place = autocomplete.getPlace();
                        if (!place.geometry || !place.geometry.location) return;
                        const lat = place.geometry.location.lat();
                        const lng = place.geometry.location.lng();
                        if (place.geometry.viewport) {
                            const bounds = place.geometry.viewport;
                            map.fitBounds([
                                [bounds.getSouthWest().lat(), bounds.getSouthWest().lng()],
                                [bounds.getNorthEast().lat(), bounds.getNorthEast().lng()]
                            ]);
                        } else {
                            map.flyTo([lat, lng], 16);
                        }
                    });
                } else {
                    setTimeout(initAutocomplete, 500);
                }
            };
            initAutocomplete();
            return container;
        }
    });
    map.addControl(new SearchControl());

    // 수정 모드에서 지도 클릭으로 위치 지정
    map.on('click', (e) => {
        if (state.isPickingEditLocation && ui.editModeContainer && !ui.editModeContainer.classList.contains('hidden') && state.currentPhoto) {
            ui.editLatInput.value = e.latlng.lat.toFixed(6);
            ui.editLngInput.value = e.latlng.lng.toFixed(6);
            if (state.currentMarker) state.currentMarker.setLatLng([e.latlng.lat, e.latlng.lng]);
            
            state.isPickingEditLocation = false;
            document.body.classList.remove('picking-location');
            ui.sidebar.classList.remove('hidden');
            if (window.innerWidth <= 768) ui.sidebar.classList.add('expanded');
            setTimeout(() => { refreshMapSize(map); }, 300);
            // showToast는 외부에서 주입
        }
    });

    const clusterGroup = L.markerClusterGroup({ 
        spiderfyOnMaxZoom: true, 
        showCoverageOnHover: false,
        iconCreateFunction: (c) => L.divIcon({ 
            html: `
                <div class="custom-cluster-icon">
                    <svg viewBox="0 0 24 24" fill="none" class="cluster-gallery-svg" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                        <polyline points="2 12 12 17 22 12"></polyline>
                        <polyline points="2 17 12 22 22 17"></polyline>
                    </svg>
                </div>
            `, 
            className: 'cluster-wrapper', 
            iconSize: [42, 42] 
        })
    });

    return { map, clusterGroup };
}

/** 맵 사이즈 재계산 (사이드바 토글 후 타일 로딩에 필요) */
export function refreshMapSize(map) {
    const start = performance.now();
    const step = (now) => {
        map.invalidateSize();
        if (now - start < 500) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}
