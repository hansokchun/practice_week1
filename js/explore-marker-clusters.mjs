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

export function getExploreExpandedClusterPositions(photos = [], { spread = 0.001 } = {}) {
    if (photos.length <= 1) {
        return photos.map((photo) => ({
            photo,
            position: { lat: Number(photo.lat), lng: Number(photo.lng) }
        }));
    }

    const center = averagePosition(photos);
    return photos.map((photo, index) => {
        const angle = ((Math.PI * 2) / photos.length) * index - (Math.PI / 2);
        return {
            photo,
            position: {
                lat: Number((center.lat + Math.sin(angle) * spread).toFixed(6)),
                lng: Number((center.lng + Math.cos(angle) * spread).toFixed(6))
            }
        };
    });
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
        if (getExploreMarkerClusters(photos, zoom, radiusPx).length >= photos.length) return zoom;
    }
    return maxZoom;
}

export function getExploreMarkerClusterBounds(photos = []) {
    const located = photos.filter((photo) => Number.isFinite(Number(photo.lat)) && Number.isFinite(Number(photo.lng)));
    if (!located.length) return null;
    const lats = located.map((photo) => Number(photo.lat));
    const lngs = located.map((photo) => Number(photo.lng));
    return {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs)
    };
}

export function shouldShowExploreClusterLabel() {
    return false;
}

export function shouldRerenderExploreMarkersAfterPinClick({ isCluster = false } = {}) {
    return !!isCluster;
}

export function getExploreViewportAction(photos = [], previousBoundsKey = null, { preserveViewport = false } = {}) {
    const boundsKey = photos.map((photo) => `${photo.id}:${photo.lat}:${photo.lng}`).join('|');
    if (preserveViewport) return { type: 'none', boundsKey: boundsKey || previousBoundsKey };
    if (photos.length > 1 && boundsKey && boundsKey !== previousBoundsKey) {
        return { type: 'fit', boundsKey };
    }
    return { type: 'none', boundsKey: previousBoundsKey || boundsKey };
}
