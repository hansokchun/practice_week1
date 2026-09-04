export const LANDING_SECTION_BATCH_SIZE = 10;

const DEFAULT_LANDING_SECTIONS = [
    { id: 'recommended', title: '추천', description: '지금 이끼에서 먼저 둘러보기 좋은 장면들', sort_order: 0 },
    { id: 'japan', title: '일본', description: '골목과 도시, 바닷가까지 일본에서 발견한 장소', sort_order: 1 },
    { id: 'road', title: '도로', description: '걷다가 마주친 도로와 골목, 철길의 풍경', sort_order: 2 },
    { id: 'water', title: '바다', description: '해안과 호수, 물가 가까이에서 남긴 장면', sort_order: 3 },
    { id: 'people', title: '사람', description: '여행지에서 마주친 사람과 일상의 장면', sort_order: 4 },
    { id: 'city', title: '도시', description: '건물과 거리, 빛이 만드는 도시의 표정', sort_order: 5 }
];

const SEARCH_CONCEPT_GROUPS = [
    ['길', '도로', '거리', '골목', '산책로', '오솔길', '시골길', '드라이브', 'road'],
    ['바다', '해변', '해안', '파도', '항구', '비치', 'beach'],
    ['산', '산맥', '등산', '봉우리', '산정상', 'mountain'],
    ['숲', '산림', '나무', '수풀', '자연', 'forest'],
    ['도시', '시내', '도심', '건물', '역', 'city'],
    ['야경', '밤', '불빛', '조명', '밤경치', 'night'],
    ['공원', '정원', '조경', '녹지', 'park'],
    ['호수', '연못', '물가', '저수지', 'lake'],
    ['눈', '설경', '설원', '겨울', 'snow'],
    ['평온', '평화', '고요', '차분', '조용', '한적', '한적한', '여유'],
    ['농촌', '시골', '마을', '전원', 'village']
];

const SCENE_SEARCH_LABELS = {
    beach: '해변 beach',
    city: '도시 city',
    desert: '사막 desert',
    forest: '숲 forest',
    indoor: '실내 indoor',
    lake: '호수 lake',
    landmark: '명소 landmark',
    mountain: '산 mountain',
    night: '야경 night',
    other: '여행 other',
    park: '공원 park',
    road: '도로 road',
    snow: '설경 snow',
    village: '마을 village'
};

function normalizeText(value) {
    return String(value ?? '').trim().toLocaleLowerCase('ko-KR');
}

function getSearchTokens(query) {
    return normalizeText(query).split(/[\s,/#]+/u).filter(Boolean);
}

function getExpandedSearchTerms(token) {
    const group = SEARCH_CONCEPT_GROUPS.find((terms) => terms.includes(token));
    return group || [token];
}

function appendSearchFields(fields, value, weight) {
    const values = Array.isArray(value) ? value : [value];
    values.forEach((item) => {
        const text = normalizeText(item);
        if (text) fields.push({ text, weight });
    });
}

function getPhotoSearchFields(photo = {}) {
    const fields = [];
    appendSearchFields(fields, photo.title, 14);
    appendSearchFields(fields, photo.placeName, 14);
    appendSearchFields(fields, photo.tags, 12);
    appendSearchFields(fields, photo.ai_tags, 12);
    appendSearchFields(fields, photo.description, 10);
    appendSearchFields(fields, photo.album, 8);
    appendSearchFields(fields, photo.ai_summary, 7);
    appendSearchFields(fields, photo.ai_moods, 6);
    appendSearchFields(fields, SCENE_SEARCH_LABELS[normalizeText(photo.ai_scene)] || photo.ai_scene, 8);
    return fields;
}

function getPhotoSearchScore(photo, query) {
    const normalizedQuery = normalizeText(query);
    const tokens = getSearchTokens(query);
    const fields = getPhotoSearchFields(photo);
    if (!tokens.length) return 0;

    let score = 0;
    for (const token of tokens) {
        const expandedTerms = getExpandedSearchTerms(token);
        let tokenScore = 0;
        fields.forEach(({ text, weight }) => {
            if (text.includes(token)) tokenScore = Math.max(tokenScore, weight * 3);
            expandedTerms.forEach((term) => {
                if (term !== token && text.includes(term)) tokenScore = Math.max(tokenScore, weight * 2);
            });
        });
        if (!tokenScore) return 0;
        score += tokenScore;
    }

    if (fields.some(({ text }) => text.includes(normalizedQuery))) score += 20;
    return score;
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
    return publicPhotos
        .map((photo, index) => ({ photo, index, score: getPhotoSearchScore(photo, normalizedQuery) }))
        .filter(({ score }) => score > 0)
        .sort((left, right) => right.score - left.score || left.index - right.index)
        .map(({ photo }) => photo);
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
