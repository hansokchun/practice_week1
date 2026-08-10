import { withGoogleMapsMapId } from './google-maps-runtime-config.mjs';

export function getLocationEditorMapOptions(
    center = { lat: 33.450701, lng: 126.570667 },
    { mapId = '' } = {}
) {
    return withGoogleMapsMapId({
        center: {
            lat: Number(center.lat),
            lng: Number(center.lng)
        },
        zoom: 13,
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
