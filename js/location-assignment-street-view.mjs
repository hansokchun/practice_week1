export const LOCATION_ASSIGNMENT_STREET_VIEW_RADII = Object.freeze([50, 200]);

function toRadians(value) {
    return value * Math.PI / 180;
}

export function getCoordinateDistanceMeters(start, end) {
    const rawCoordinates = [start?.lat, start?.lng, end?.lat, end?.lng];
    if (rawCoordinates.some((value) => value === null || value === undefined || value === '')) return null;

    const startLat = Number(start?.lat);
    const startLng = Number(start?.lng);
    const endLat = Number(end?.lat);
    const endLng = Number(end?.lng);
    if (![startLat, startLng, endLat, endLng].every(Number.isFinite)) return null;

    const earthRadiusMeters = 6371000;
    const latDelta = toRadians(endLat - startLat);
    const lngDelta = toRadians(endLng - startLng);
    const startLatRadians = toRadians(startLat);
    const endLatRadians = toRadians(endLat);
    const haversine = Math.sin(latDelta / 2) ** 2
        + Math.cos(startLatRadians) * Math.cos(endLatRadians) * Math.sin(lngDelta / 2) ** 2;

    return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function formatStreetViewDistance(distanceMeters) {
    if (!Number.isFinite(distanceMeters)) return '선택한 위치에서 가장 가까운 거리뷰입니다.';
    if (distanceMeters < 10) return '선택한 위치 바로 근처의 거리뷰입니다.';
    return `선택한 위치에서 약 ${Math.round(distanceMeters / 10) * 10}m 떨어진 거리뷰입니다.`;
}
