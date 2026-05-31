function clampLatitude(lat) {
    return Math.max(-85.05112878, Math.min(85.05112878, Number(lat)));
}

function toWorldPixel(lat, lng, zoom) {
    const scale = 256 * (2 ** Math.max(0, Number(zoom) || 0));
    const sinLat = Math.sin((clampLatitude(lat) * Math.PI) / 180);
    return {
        x: ((Number(lng) + 180) / 360) * scale,
        y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale
    };
}

function averagePosition(photos) {
    const count = photos.length || 1;
    return {
        lat: photos.reduce((sum, photo) => sum + Number(photo.lat || 0), 0) / count,
        lng: photos.reduce((sum, photo) => sum + Number(photo.lng || 0), 0) / count
    };
}

export function getExploreMarkerClusters(photos = [], zoom = 7, radiusPx = 54) {
    const buckets = new Map();
    photos.forEach((photo) => {
        const point = toWorldPixel(photo.lat, photo.lng, zoom);
        const key = `${Math.floor(point.x / radiusPx)}:${Math.floor(point.y / radiusPx)}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(photo);
    });

    return [...buckets.values()].map((items) => ({
        id: items.map((photo) => photo.id || `${photo.lat},${photo.lng}`).join('|'),
        count: items.length,
        photos: items,
        position: averagePosition(items)
    }));
}

export function getExploreMarkerExpansionZoom(photos = [], currentZoom = 7, { radiusPx = 54, maxZoom = 18 } = {}) {
    const startZoom = Math.max(0, Math.floor(Number(currentZoom) || 0));
    for (let zoom = startZoom + 1; zoom <= maxZoom; zoom += 1) {
        if (getExploreMarkerClusters(photos, zoom, radiusPx).length > 1) return zoom;
    }
    return maxZoom;
}

export function shouldShowExploreClusterLabel() {
    return false;
}

export function shouldRerenderExploreMarkersAfterPinClick({ isCluster = false } = {}) {
    return !!isCluster;
}

export function getExploreViewportAction(photos = [], previousBoundsKey = null) {
    const boundsKey = photos.map((photo) => `${photo.id}:${photo.lat}:${photo.lng}`).join('|');
    if (photos.length > 1 && boundsKey && boundsKey !== previousBoundsKey) {
        return { type: 'fit', boundsKey };
    }
    return { type: 'none', boundsKey: previousBoundsKey || boundsKey };
}
