export function getExplorePreviewExpansionAction({
    clickedPreviewPhoto = false,
    clickedInsidePreview = false,
    isExpanded = false
} = {}) {
    if (clickedPreviewPhoto) return 'expand';
    if (isExpanded && !clickedInsidePreview) return 'collapse';
    return 'none';
}
