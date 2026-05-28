function hasLocation(photo) {
    if (photo?.lat === null || photo?.lat === undefined || photo?.lng === null || photo?.lng === undefined) return false;
    return Number.isFinite(Number(photo?.lat)) && Number.isFinite(Number(photo?.lng));
}

function getPhotoDay(photo) {
    const rawDate = photo?.date || photo?.created_at;
    if (!rawDate) return null;
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
}

export function getTravelSummary({ draftPhotos = [], albumDrafts = [], selectedAlbum = null } = {}) {
    const photoCount = Number(selectedAlbum?.photo_count || 0) || draftPhotos.length;
    const locatedCount = draftPhotos.filter(hasLocation).length;
    const dayCount = new Set(draftPhotos.map(getPhotoDay).filter(Boolean)).size;

    return {
        title: selectedAlbum?.title || albumDrafts[0]?.name || '나의 여행 앨범',
        photoCount,
        places: Number(selectedAlbum?.places || 0) || (photoCount ? Math.max(1, locatedCount || Math.ceil(photoCount / 4)) : 0),
        days: photoCount ? Math.max(1, dayCount) : 0,
        publicCount: Math.max(0, photoCount - Math.min(2, photoCount))
    };
}
