export const EXPLORE_MAP_MIN_ZOOM = 4;

export function getExploreMapOptions({ center = { lat: 36.45, lng: 127.85 }, zoom = 7 } = {}) {
    return {
        center,
        zoom,
        minZoom: EXPLORE_MAP_MIN_ZOOM,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        gestureHandling: 'greedy',
        clickableIcons: false,
        styles: [
            {
                featureType: 'poi',
                stylers: [{ visibility: 'off' }]
            },
            {
                featureType: 'transit',
                stylers: [{ visibility: 'off' }]
            }
        ]
    };
}
