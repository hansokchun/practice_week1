export const APP_SECTIONS = Object.freeze({
    HOME: 'home',
    MYPHOTO: 'myphoto',
    EXPLORE: 'explore'
});

const SECTION_SET = new Set(Object.values(APP_SECTIONS));

export function normalizeAppSection(value) {
    return SECTION_SET.has(value) ? value : APP_SECTIONS.HOME;
}

export function sectionToHash(section) {
    const normalized = normalizeAppSection(section);
    if (normalized === APP_SECTIONS.HOME) return '#/';
    return `#/${normalized}`;
}

export function parseSectionHash(hash) {
    if (!hash || typeof hash !== 'string') return null;
    if (!hash.startsWith('#/')) return null;

    const path = hash.slice(2).split('?')[0].replace(/^\/+|\/+$/g, '');
    if (path === '') return APP_SECTIONS.HOME;
    return SECTION_SET.has(path) ? path : null;
}

export function getSectionForViewMode(viewMode) {
    return viewMode === 'shared' ? APP_SECTIONS.EXPLORE : APP_SECTIONS.MYPHOTO;
}

export function getViewModeForSection(section) {
    return normalizeAppSection(section) === APP_SECTIONS.EXPLORE ? 'shared' : 'my';
}
