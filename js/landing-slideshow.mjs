export const LANDING_SLIDE_INTERVAL_MS = 10_000;

export function getNextLandingSlideIndex(currentIndex, slideCount) {
    const normalizedCount = Number.isFinite(slideCount) ? Math.max(0, Math.floor(slideCount)) : 0;
    if (normalizedCount === 0) return 0;
    const normalizedIndex = Number.isFinite(currentIndex) ? Math.max(0, Math.floor(currentIndex)) : 0;
    return (normalizedIndex + 1) % normalizedCount;
}
