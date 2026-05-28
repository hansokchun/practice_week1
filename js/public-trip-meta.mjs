export function getPublicTripRouteMeta(summary = {}) {
    const dateRange = summary.dateRange || '날짜 미정';
    const places = Math.max(0, Number(summary.places || 0));
    const photoCount = Math.max(0, Number(summary.photoCount || 0));
    return `${dateRange} · ${places} places · ${photoCount} public photos`;
}
