export const PHOTO_AI_ANALYSIS_VERSION = '2';
export const PHOTO_AI_VISION_MODEL = '@cf/moondream/moondream3.1-9B-A2B';
export const PHOTO_AI_STRUCTURE_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
export const PHOTO_AI_MODEL = `${PHOTO_AI_VISION_MODEL}+${PHOTO_AI_STRUCTURE_MODEL}`;

const ALLOWED_SCENES = new Set([
    'beach',
    'city',
    'desert',
    'forest',
    'indoor',
    'lake',
    'landmark',
    'mountain',
    'night',
    'other',
    'park',
    'road',
    'snow',
    'village'
]);

const SCENE_KOREAN_LABELS = {
    beach: '해변',
    city: '도시',
    desert: '사막',
    forest: '숲',
    indoor: '실내',
    lake: '호수',
    landmark: '명소',
    mountain: '산',
    night: '야경',
    other: '여행',
    park: '공원',
    road: '도로',
    snow: '설경',
    village: '마을'
};

const MOOD_TRANSLATIONS = new Map([
    ['functional', '기능적'],
    ['industrial', '산업적'],
    ['inviting', '편안함'],
    ['natural', '자연스러움'],
    ['peaceful', '평온'],
    ['serene', '차분'],
    ['yên bình', '평온']
]);

const FOREIGN_LETTERS = /[A-Za-z\u00c0-\u024f\u3040-\u30ff\u3400-\u9fff]/u;

function normalizeText(value, maxLength) {
    return typeof value === 'string'
        ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength)
        : '';
}

function normalizeList(value, limit) {
    if (!Array.isArray(value)) return [];

    const unique = [];
    const seen = new Set();
    value.forEach((item) => {
        const normalized = normalizeText(item, 24);
        const key = normalized.toLocaleLowerCase('ko-KR');
        if (!normalized || seen.has(key) || unique.length >= limit) return;
        seen.add(key);
        unique.push(normalized);
    });
    return unique;
}

function normalizeKoreanList(value, limit, translations = new Map()) {
    return normalizeList((Array.isArray(value) ? value : []).map((item) => {
        const raw = normalizeText(item, 24);
        const translated = translations.get(raw.toLocaleLowerCase('en-US')) || raw;
        const koreanOnly = translated
            .replace(/[A-Za-z\u00c0-\u024f]+/gu, ' ')
            .replace(/[\u3040-\u30ff\u3400-\u9fff]+/gu, ' ')
            .replace(/[^\p{Script=Hangul}\d\s-]+/gu, ' ');
        const normalized = normalizeText(koreanOnly, 24);
        return /[가-힣]/u.test(normalized) ? normalized : '';
    }), limit);
}

export function normalizePhotoAiAnalysis(value = {}) {
    const scene = normalizeText(value.scene, 24).toLowerCase();
    const normalizedScene = ALLOWED_SCENES.has(scene) ? scene : 'other';
    const sceneLabel = SCENE_KOREAN_LABELS[normalizedScene];
    const tags = normalizeKoreanList(value.tags, 10);
    const summary = normalizeText(value.summary, 160);
    const safeSummary = summary && /[가-힣]/u.test(summary) && !FOREIGN_LETTERS.test(summary)
        ? summary
        : `${sceneLabel} 풍경이 담긴 여행 사진입니다.`;
    return {
        tags: tags.length ? tags : [sceneLabel],
        summary: safeSummary,
        scene: normalizedScene,
        moods: normalizeKoreanList(value.moods, 3, MOOD_TRANSLATIONS)
    };
}
