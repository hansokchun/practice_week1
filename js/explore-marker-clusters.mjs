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

function getSpreadPosition(center, index, count, zoom) {
    const angle = ((Math.PI * 2) / Math.max(1, count)) * index - (Math.PI / 2);
    const degreesPerPixel = 360 / (256 * (2 ** Math.max(0, Number(zoom) || 0)));
    const radiusPx = Math.min(42, 24 + count * 2);
    const latitudeScale = Math.max(0.2, Math.cos((Number(center.lat) * Math.PI) / 180));
    return {
        lat: Number(center.lat) - (Math.sin(angle) * radiusPx * degreesPerPixel * latitudeScale),
        lng: Number(center.lng) + (Math.cos(angle) * radiusPx * degreesPerPixel)
    };
}

export function getExploreMarkerClusters(photos = [], zoom = 7, radiusPx = 54) {
    const clusters = [];
    photos.forEach((photo) => {
        const point = toWorldPixel(photo.lat, photo.lng, zoom);
        const cluster = clusters.find((candidate) => (
            Math.hypot(candidate.point.x - point.x, candidate.point.y - point.y) <= radiusPx
        ));
        if (cluster) {
            cluster.photos.push(photo);
            cluster.point = {
                x: (cluster.point.x * (cluster.photos.length - 1) + point.x) / cluster.photos.length,
                y: (cluster.point.y * (cluster.photos.length - 1) + point.y) / cluster.photos.length
            };
            return;
        }
        clusters.push({ point, photos: [photo] });
    });

    const normalizedClusters = clusters.map(({ photos: items }) => ({
        id: items.map((photo) => photo.id || `${photo.lat},${photo.lng}`).join('|'),
        count: items.length,
        photos: items,
        position: averagePosition(items)
    }));

    if (Number(zoom) < 20) return normalizedClusters;
    return normalizedClusters.flatMap((cluster) => {
        if (cluster.count === 1) return cluster;
        return cluster.photos.map((photo, index) => ({
            id: String(photo.id || `${photo.lat},${photo.lng}:${index}`),
            count: 1,
            photos: [photo],
            position: getSpreadPosition(cluster.position, index, cluster.count, zoom)
        }));
    });
}

export function getExploreMarkerExpansionZoom(photos = [], currentZoom = 7, {
    radiusPx = 54,
    maxZoom = 18
} = {}) {
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
    if (photos.length === 1 && boundsKey && boundsKey !== previousBoundsKey) {
        return {
            type: 'focus',
            boundsKey,
            center: {
                lat: Number(photos[0].lat),
                lng: Number(photos[0].lng)
            }
        };
    }
    if (photos.length > 1 && boundsKey && boundsKey !== previousBoundsKey) {
        return { type: 'fit', boundsKey };
    }
    return { type: 'none', boundsKey: previousBoundsKey || boundsKey };
}
