export const EXPLORE_PHOTO_PIN_COLOR = '#e4573d';
export const EXPLORE_CLUSTER_PIN_COLOR = '#0f5856';

const PHOTO_PIN_PATH = 'M24 45s15-13.4 15-27A15 15 0 0 0 9 18c0 13.6 15 27 15 27Z M24 24a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z';

export function getExplorePinSymbolIcon(maps, { size = 36, type = 'photo' } = {}) {
    const isCluster = type === 'cluster';
    return {
        path: PHOTO_PIN_PATH,
        fillColor: isCluster ? EXPLORE_CLUSTER_PIN_COLOR : EXPLORE_PHOTO_PIN_COLOR,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        scale: (isCluster ? size + 8 : size) / 48,
        anchor: new maps.Point(24, 45)
    };
}
