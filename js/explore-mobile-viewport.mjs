const DESKTOP_PADDING = 96;
const MOBILE_SIDE_PADDING = 28;
const MOBILE_TOP_PADDING = 72;

export function getExploreMapFitPadding({
    isMobile = false,
    isDrawerOpen = false,
    viewportHeight = 0,
    drawerHeight = 0
} = {}) {
    if (!isMobile) return DESKTOP_PADDING;

    const height = Math.max(0, Number(viewportHeight) || 0);
    const fallbackDrawerHeight = Math.min(height * 0.58, 520);
    const resolvedDrawerHeight = Math.max(0, Number(drawerHeight) || fallbackDrawerHeight);
    const bottom = isDrawerOpen
        ? Math.round(resolvedDrawerHeight + 24)
        : MOBILE_TOP_PADDING;

    return {
        top: MOBILE_TOP_PADDING,
        right: MOBILE_SIDE_PADDING,
        bottom,
        left: MOBILE_SIDE_PADDING
    };
}

export function getExploreMapFocusPanY(padding) {
    if (!padding || typeof padding === 'number') return 0;
    return Math.max(0, Math.round((Number(padding.bottom) - Number(padding.top)) / 2));
}

export function getExploreMapPreviewFocusPanY({
    isMobile = false,
    viewportHeight = 0,
    previewHeight = 0
} = {}) {
    if (!isMobile) return 0;

    const height = Math.max(0, Number(viewportHeight) || 0);
    const fallbackPreviewHeight = Math.min(height * 0.58, 520);
    const resolvedPreviewHeight = Math.max(0, Number(previewHeight) || fallbackPreviewHeight);

    return getExploreMapFocusPanY({
        top: MOBILE_TOP_PADDING,
        bottom: Math.round(resolvedPreviewHeight + 24)
    });
}
