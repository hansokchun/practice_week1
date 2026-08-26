export const LANDING_SECTION_BATCH_SIZE = 10;

const DEFAULT_LANDING_SECTIONS = [
    { id: 'recommended', title: '추천', description: '', sort_order: 0 },
    { id: 'korea', title: '한국', description: '', sort_order: 1 },
    { id: 'japan', title: '일본', description: '', sort_order: 2 },
    { id: 'landscape', title: '풍경', description: '', sort_order: 3 },
    { id: 'city', title: '도시', description: '', sort_order: 4 }
];

function normalizeText(value) {
    return String(value ?? '').trim().toLocaleLowerCase('ko-KR');
}

export function isLandingAdmin(user) {
    return user?.app_metadata?.role === 'admin';
}

export function getDefaultLandingSections() {
    return DEFAULT_LANDING_SECTIONS.map((section) => ({ ...section, is_visible: true, photo_ids: [] }));
}

export function normalizeLandingSections(sections = [], assignments = [], { includeHidden = false } = {}) {
    const assignedBySection = assignments.reduce((map, assignment) => {
        const sectionId = String(assignment?.section_id || '');
        if (!sectionId) return map;
        map[sectionId] ||= [];
        map[sectionId].push(assignment);
        return map;
    }, {});

    return sections
        .filter((section) => section?.id && (includeHidden || section?.is_visible !== false))
        .sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0))
        .map((section) => ({
            ...section,
            id: String(section.id),
            title: String(section.title || '여행 사진').trim(),
            description: String(section.description || '').trim(),
            photo_ids: (assignedBySection[String(section.id)] || [])
                .sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0))
                .map((assignment) => String(assignment.photo_id))
        }));
}

export function getLandingSearchResults(photos = [], query = '') {
    const normalizedQuery = normalizeText(query);
    const publicPhotos = photos.filter((photo) => photo?.shared || photo?.visibility === 'public');
    if (!normalizedQuery) return publicPhotos;
    return publicPhotos.filter((photo) => [
        photo.title,
        photo.description,
        photo.placeName,
        photo.album,
        photo.tags
    ].some((value) => normalizeText(Array.isArray(value) ? value.join(' ') : value).includes(normalizedQuery)));
}

export function getLandingSectionPhotos(section, photos = [], fallbackIndex = 0) {
    const publicPhotos = getLandingSearchResults(photos);
    if (!section?.photo_ids?.length) {
        if (!publicPhotos.length) return [];
        const offset = Math.abs(Number(fallbackIndex) || 0) % publicPhotos.length;
        return [...publicPhotos.slice(offset), ...publicPhotos.slice(0, offset)];
    }
    const photoById = new Map(publicPhotos.map((photo) => [String(photo.id), photo]));
    return section.photo_ids.map((photoId) => photoById.get(String(photoId))).filter(Boolean);
}

export function getLandingVisiblePhotos(photos = [], visibleCount = LANDING_SECTION_BATCH_SIZE) {
    return photos.slice(0, Math.max(LANDING_SECTION_BATCH_SIZE, Number(visibleCount) || 0));
}
