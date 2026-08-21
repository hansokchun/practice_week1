function easeOutCubic(progress) {
    return 1 - ((1 - progress) ** 3);
}

function getCoordinateValue(position, axis) {
    const value = position?.[axis];
    return Number(typeof value === 'function' ? value.call(position) : value);
}

function readMapCenter(map) {
    const center = map?.getCenter?.();
    return {
        lat: getCoordinateValue(center, 'lat'),
        lng: getCoordinateValue(center, 'lng')
    };
}

export function getExploreMapCameraFrame({
    startCenter,
    targetCenter,
    startZoom,
    targetZoom,
    progress
}) {
    const easedProgress = easeOutCubic(Math.max(0, Math.min(1, Number(progress) || 0)));
    return {
        center: {
            lat: Number(startCenter.lat) + ((Number(targetCenter.lat) - Number(startCenter.lat)) * easedProgress),
            lng: Number(startCenter.lng) + ((Number(targetCenter.lng) - Number(startCenter.lng)) * easedProgress)
        },
        zoom: Number(startZoom) + ((Number(targetZoom) - Number(startZoom)) * easedProgress)
    };
}

export function animateExploreMapCamera(map, { center, zoom }, {
    duration = 420,
    now = () => performance.now(),
    requestFrame = (callback) => window.requestAnimationFrame(callback)
} = {}) {
    const startCenter = readMapCenter(map);
    const startZoom = Number(map?.getZoom?.());
    const targetCenter = { lat: Number(center?.lat), lng: Number(center?.lng) };
    const targetZoom = Number(zoom);
    const canAnimate = [
        startCenter.lat,
        startCenter.lng,
        startZoom,
        targetCenter.lat,
        targetCenter.lng,
        targetZoom
    ].every(Number.isFinite);

    if (!canAnimate) {
        map?.setCenter?.(targetCenter);
        map?.setZoom?.(targetZoom);
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const startTime = now();
        const renderFrame = (timestamp) => {
            const progress = Math.min(1, Math.max(0, (Number(timestamp) - startTime) / duration));
            const camera = getExploreMapCameraFrame({
                startCenter,
                targetCenter,
                startZoom,
                targetZoom,
                progress
            });
            if (typeof map.moveCamera === 'function') map.moveCamera(camera);
            else {
                map.setCenter?.(camera.center);
                map.setZoom?.(camera.zoom);
            }
            if (progress < 1) requestFrame(renderFrame);
            else resolve();
        };
        requestFrame(renderFrame);
    });
}
