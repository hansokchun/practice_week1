function hasLocation(photo) {
    if (photo?.lat === null || photo?.lat === undefined || photo?.lng === null || photo?.lng === undefined) return false;
    return Number.isFinite(Number(photo.lat)) && Number.isFinite(Number(photo.lng));
}

function getPhotoDay(photo) {
    const rawDate = photo?.date || photo?.created_at;
    if (!rawDate) return null;
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
}

function formatDay(day) {
    return day.replaceAll('-', '.');
}

export function getTravelDaySummaries(photos = []) {
    const groups = new Map();
    photos.forEach((photo) => {
        const day = getPhotoDay(photo);
        if (!day) return;
        if (!groups.has(day)) groups.set(day, []);
        groups.get(day).push(photo);
    });

    return [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, dayPhotos], index) => ({
            dayLabel: `Day ${index + 1}`,
            title: formatDay(day),
            photoCount: dayPhotos.length,
            places: Math.max(1, dayPhotos.filter(hasLocation).length)
        }));
}
