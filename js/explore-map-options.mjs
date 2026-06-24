export const EXPLORE_MAP_MIN_ZOOM = 4;

const QUIET_EXPLORE_MAP_STYLES = [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.neighborhood', elementType: 'labels', stylers: [{ visibility: 'off' }] }
];

export function getExploreMapOptions({ center = { lat: 36.45, lng: 127.85 }, zoom = 7 } = {}) {
    return {
        center,
        zoom,
        minZoom: EXPLORE_MAP_MIN_ZOOM,
        styles: QUIET_EXPLORE_MAP_STYLES,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        gestureHandling: 'greedy'
    };
}
