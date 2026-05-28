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

export function formatMissingLocationSummary(count) {
    const normalizedCount = Math.max(0, Number(count || 0));
    if (!normalizedCount) return '위치 정보가 모두 정리되었습니다.';
    return `처리 필요: 위치 정보 없는 사진 ${normalizedCount}장`;
}
