import { withGoogleMapsMapId } from './google-maps-runtime-config.mjs';

export function getLocationEditorMapOptions(
    center = { lat: 37.579617, lng: 126.977041 },
    { mapId = '', zoom = 7 } = {}
) {
    return withGoogleMapsMapId({
        center: {
            lat: Number(center.lat),
            lng: Number(center.lng)
        },
        zoom,
        disableDefaultUI: true,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        zoomControl: false,
        scaleControl: false,
        rotateControl: false,
        keyboardShortcuts: false,
        clickableIcons: false,
        gestureHandling: 'greedy'
    }, mapId);
}
