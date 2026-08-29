const LANDING_TAG_ROUTE = 'tag';

export function buildLandingTagHash(sectionId) {
    const normalizedId = String(sectionId || '').trim();
    if (!normalizedId) return '#/landing';
    return `#/${LANDING_TAG_ROUTE}?section=${encodeURIComponent(normalizedId)}`;
}

export function parseLandingTagId(hash) {
    const value = String(hash || '');
    const [path, query = ''] = value.replace(/^#\//, '').split('?');
    if (path !== LANDING_TAG_ROUTE) return null;
    return new URLSearchParams(query).get('section');
}

export function canOpenLandingTagPage(section) {
    const sectionId = String(section?.id || '').trim();
    const sectionTitle = String(section?.title || '').trim();
    return Boolean(
        sectionId
        && !['recommended', 'search-results'].includes(sectionId)
        && sectionTitle !== '추천'
    );
}
