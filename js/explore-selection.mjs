export function shouldOpenExplorePreview({ isTripLink = false, isExploreListItem = false } = {}) {
    return Boolean(isExploreListItem && !isTripLink);
}
