import { hasUsablePhotoLocation } from './photo-location.mjs';

function hasLocation(photo) {
    return hasUsablePhotoLocation(photo);
}

function getPhotoDay(photo) {
    const rawDate = photo?.date || photo?.created_at;
    if (!rawDate) return null;
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
}

function formatDate(day) {
    return day.replaceAll('-', '.');
}

function getDateRange(days) {
    if (!days.length) return '날짜 미정';
    if (days.length === 1) return formatDate(days[0]);
    return `${formatDate(days[0])} - ${formatDate(days[days.length - 1])}`;
}

export function getTravelSummary({ draftPhotos = [], albumDrafts = [], selectedAlbum = null } = {}) {
    const photoCount = Number(selectedAlbum?.photo_count || 0) || draftPhotos.length;
    const locatedCount = draftPhotos.filter(hasLocation).length;
    const sortedDays = [...new Set(draftPhotos.map(getPhotoDay).filter(Boolean))].sort();
    const dayCount = sortedDays.length;

    return {
        title: selectedAlbum?.title || albumDrafts[0]?.name || '나의 여행 앨범',
        photoCount,
        places: Number(selectedAlbum?.places || 0) || (photoCount ? Math.max(1, locatedCount || Math.ceil(photoCount / 4)) : 0),
        days: photoCount ? Math.max(1, dayCount) : 0,
        dateRange: getDateRange(sortedDays),
        publicCount: Math.max(0, photoCount - Math.min(2, photoCount))
    };
}
