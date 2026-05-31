export function getLocationEditorMapOptions(center = { lat: 33.450701, lng: 126.570667 }) {
    return {
        center: {
            lat: Number(center.lat),
            lng: Number(center.lng)
        },
        zoom: 13,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        gestureHandling: 'greedy'
    };
}
