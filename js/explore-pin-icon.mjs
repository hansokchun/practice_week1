export const EXPLORE_PHOTO_PIN_COLOR = '#e4573d';
export const EXPLORE_ALBUM_PIN_COLOR = '#6d4aff';

const PHOTO_PIN_PATH = 'M24 45s15-13.4 15-27A15 15 0 0 0 9 18c0 13.6 15 27 15 27Z M24 24a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z';
const ALBUM_PIN_PATH = 'M24 4 42 15v21L24 46 6 36V15L24 4Z M16 18h16v4H16v-4Z M16 27h16v4H16v-4Z';

export function getExplorePinSymbolIcon(maps, { size = 36, type = 'photo' } = {}) {
    const isAlbum = type === 'album';
    return {
        path: isAlbum ? ALBUM_PIN_PATH : PHOTO_PIN_PATH,
        fillColor: isAlbum ? EXPLORE_ALBUM_PIN_COLOR : EXPLORE_PHOTO_PIN_COLOR,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        scale: size / 48,
        anchor: new maps.Point(24, 45)
    };
}
