export const PHOTO_AI_ANALYSIS_VERSION = '1';
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

export function normalizePhotoAiAnalysis(value = {}) {
    const scene = normalizeText(value.scene, 24).toLowerCase();
    return {
        tags: normalizeList(value.tags, 10),
        summary: normalizeText(value.summary, 160),
        scene: ALLOWED_SCENES.has(scene) ? scene : 'other',
        moods: normalizeList(value.moods, 3)
    };
}
