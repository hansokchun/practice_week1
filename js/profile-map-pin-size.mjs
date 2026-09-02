export function getProfileMapPinSize(zoom) {
    const normalizedZoom = Number.isFinite(Number(zoom)) ? Number(zoom) : 7;
    const clampedZoom = Math.min(13, Math.max(3, normalizedZoom));
    return Math.floor(14 + ((clampedZoom - 3) * 14) / 10);
}
