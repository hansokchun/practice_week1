export const EXPLORE_PIN_COLOR = '#155659';

export function getExplorePinSymbolIcon(maps, { size = 34 } = {}) {
    return {
        path: 'M24 45s15-13.4 15-27A15 15 0 0 0 9 18c0 13.6 15 27 15 27Z M24 24a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z',
        fillColor: EXPLORE_PIN_COLOR,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        scale: size / 48,
        anchor: new maps.Point(24, 45)
    };
}
