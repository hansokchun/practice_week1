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
    requestFrame,
    cancelFrame,
    setTimer,
    clearTimer
} = {}) {
    const runtime = typeof window === 'undefined' ? globalThis : window;
    const requestFrameCallback = requestFrame || ((callback) => runtime.requestAnimationFrame(callback));
    const cancelFrameCallback = cancelFrame || ((frameId) => runtime.cancelAnimationFrame?.(frameId));
    const setTimerCallback = setTimer || ((callback, delay) => runtime.setTimeout(callback, delay));
    const clearTimerCallback = clearTimer || ((timerId) => runtime.clearTimeout(timerId));
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
        let frameId = null;
        let fallbackTimer = null;
        let settled = false;
        const settle = () => {
            if (settled) return;
            settled = true;
            if (frameId !== null) cancelFrameCallback(frameId);
            if (fallbackTimer !== null) clearTimerCallback(fallbackTimer);
            const finalCamera = { center: targetCenter, zoom: targetZoom };
            if (typeof map.moveCamera === 'function') map.moveCamera(finalCamera);
            else {
                map.setCenter?.(finalCamera.center);
                map.setZoom?.(finalCamera.zoom);
            }
            resolve();
        };
        const renderFrame = (timestamp) => {
            if (settled) return;
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
            if (progress < 1) frameId = requestFrameCallback(renderFrame);
            else settle();
        };
        frameId = requestFrameCallback(renderFrame);
        fallbackTimer = setTimerCallback(settle, duration + 180);
    });
}
