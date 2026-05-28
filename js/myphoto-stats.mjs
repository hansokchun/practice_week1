import { getMissingLocationPhotos } from './location-workflow.mjs';

export function getMyphotoStats(photos = [], albums = []) {
    const missingLocationPhotos = getMissingLocationPhotos(photos);
    const albumNames = new Set(photos.map((photo) => photo.album).filter(Boolean));
    const albumCount = albums.length || albumNames.size;

    return {
        photoCount: photos.length,
        locatedCount: photos.length - missingLocationPhotos.length,
        missingLocationCount: missingLocationPhotos.length,
        albumCount
    };
}
