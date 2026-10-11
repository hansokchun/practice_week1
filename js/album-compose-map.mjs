import { createGoogleMapsMarker } from './google-maps-marker.mjs';
import { withGoogleMapsMapId } from './google-maps-runtime-config.mjs';
import { hasUsablePhotoLocation } from './photo-location.mjs';

export function createAlbumComposeMapController({ loadMaps, getMapId = () => '', getMarkerIcon, getMarkerTitle = () => '사진 위치' }) {
    let version = 0;
    let map = null;
    let maps = null;
    let container = null;
    let markers = [];
    let photoKey = '';

    function clearMarkers() {
        markers.forEach(marker => {
            maps?.event.clearInstanceListeners?.(marker.raw || marker);
            marker.setMap(null);
        });
        markers = [];
    }

    function releaseMap() {
        clearMarkers();
        if (map) maps?.event.clearInstanceListeners?.(map);
        map = null;
        container = null;
        photoKey = '';
    }

    return {
        cancel() { version++; },
        dispose() {
            version++;
            releaseMap();
            maps = null;
        },
        async render(target, photos = []) {
            const token = ++version;
            const located = photos.filter(hasUsablePhotoLocation);
            if (!target || !located.length) {
                this.dispose();
                return 'empty';
            }
            const isCurrent = () => token === version && target.isConnected !== false;
            try {
                const api = maps || await loadMaps();
                if (!isCurrent()) return 'stale';
                if (!api) return 'unavailable';
                maps = api;
                const mapId = getMapId();
                const center = { lat: Number(located[0].lat), lng: Number(located[0].lng) };
                if (target !== container || !map) {
                    releaseMap();
                    container = target;
                    map = new maps.Map(target, withGoogleMapsMapId({
                        center, zoom: 13, maxZoom: 18,
                        disableDefaultUI: true,
                        zoomControl: true,
                        fullscreenControl: false,
                        streetViewControl: false,
                        mapTypeControl: false,
                        gestureHandling: 'cooperative'
                    }, mapId));
                }
                maps.event.trigger(map, 'resize');
                const nextKey = JSON.stringify(located.map(photo => [String(photo.id || photo.localId || ''), Number(photo.lat), Number(photo.lng)]).sort());
                // Native map markers keep their geographic anchor through every camera change.
                if (nextKey !== photoKey) {
                    clearMarkers();
                    for (const photo of located) {
                        markers.push(createGoogleMapsMarker(maps, {
                            map,
                            position: { lat: Number(photo.lat), lng: Number(photo.lng) },
                            title: getMarkerTitle(photo),
                            ...(getMarkerIcon ? { icon: getMarkerIcon(maps) } : {})
                        }, { mapId }));
                    }
                    if (located.length > 1) {
                        const bounds = new maps.LatLngBounds();
                        located.forEach(photo => bounds.extend({ lat: Number(photo.lat), lng: Number(photo.lng) }));
                        map.fitBounds(bounds, 40);
                    } else {
                        map.setCenter(center);
                        map.setZoom(13);
                    }
                    photoKey = nextKey;
                }
                return 'ready';
            } catch {
                if (!isCurrent()) return 'stale';
                releaseMap();
                return 'unavailable';
            }
        }
    };
}
