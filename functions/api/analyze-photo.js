import {
    PHOTO_AI_ANALYSIS_VERSION,
    normalizePhotoAiAnalysis
} from '../../js/photo-ai-analysis.mjs';

const SUPABASE_URL = 'https://pqczcponriukilrtpbdl.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_m158oMsJtKHn2sUD3m7x-w_Rs6swjl8';
const PHOTO_AI_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';
const DAILY_ANALYSIS_LIMIT = 25;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json; charset=utf-8'
        }
    });
}

function getBearerToken(request) {
    const authorization = request.headers.get('Authorization') || '';
    return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
}

function getSupabaseHeaders(token, extraHeaders = {}) {
    return {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
        ...extraHeaders
    };
}

function encodeStoragePath(path) {
    return String(path || '')
        .split('/')
        .filter(Boolean)
        .map(encodeURIComponent)
        .join('/');
}

function toBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return btoa(binary);
}

function parseAiPayload(result) {
    const value = result?.response ?? result;
    if (value && typeof value === 'object') return value;
    if (typeof value !== 'string') return {};

    const text = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
        return JSON.parse(text);
    } catch {
        return {};
    }
}

function getStoredAnalysis(photo) {
    return normalizePhotoAiAnalysis({
        tags: photo.ai_tags,
        summary: photo.ai_summary,
        scene: photo.ai_scene,
        moods: photo.ai_moods
    });
}

async function fetchCurrentUser(token) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: getSupabaseHeaders(token)
    });
    if (!response.ok) return null;
    return response.json();
}

async function fetchOwnedPhoto(token, userId, photoId) {
    const select = 'id,owner_id,storage_path,ai_tags,ai_summary,ai_scene,ai_moods,ai_analysis_status,ai_analyzed_at,ai_analysis_model';
    const query = `select=${encodeURIComponent(select)}&owner_id=eq.${encodeURIComponent(userId)}&id=eq.${encodeURIComponent(photoId)}&limit=1`;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/photos?${query}`, {
        headers: getSupabaseHeaders(token)
    });
    if (!response.ok) throw new Error('photo_lookup_failed');
    const rows = await response.json();
    return rows[0] || null;
}

async function getDailyAnalysisCount(token, userId) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const query = new URLSearchParams({
        select: 'id',
        owner_id: `eq.${userId}`,
        ai_analyzed_at: `gte.${start.toISOString()}`,
        limit: '1'
    });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/photos?${query}`, {
        headers: getSupabaseHeaders(token, {
            Prefer: 'count=exact',
            Range: '0-0'
        })
    });
    if (!response.ok) throw new Error('analysis_count_failed');
    const total = response.headers.get('Content-Range')?.split('/').pop();
    return Number.isFinite(Number(total)) ? Number(total) : 0;
}

async function updatePhotoAnalysis(token, userId, photoId, updates) {
    const query = new URLSearchParams({
        owner_id: `eq.${userId}`,
        id: `eq.${photoId}`
    });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/photos?${query}`, {
        method: 'PATCH',
        headers: getSupabaseHeaders(token, {
            'Content-Type': 'application/json',
            Prefer: 'return=representation'
        }),
        body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('analysis_update_failed');
    const rows = await response.json();
    return rows[0] || null;
}

async function downloadPhoto(token, storagePath) {
    const safePath = encodeStoragePath(storagePath);
    if (!safePath) throw new Error('photo_storage_path_missing');

    const response = await fetch(
        `${SUPABASE_URL}/storage/v1/object/authenticated/photos/${safePath}`,
        { headers: getSupabaseHeaders(token) }
    );
    if (!response.ok) throw new Error('photo_download_failed');

    const contentType = response.headers.get('Content-Type') || '';
    const contentLength = Number(response.headers.get('Content-Length') || 0);
    if (!contentType.startsWith('image/')) throw new Error('unsupported_photo_type');
    if (contentLength > MAX_IMAGE_BYTES) throw new Error('photo_too_large');

    const image = await response.arrayBuffer();
    if (image.byteLength > MAX_IMAGE_BYTES) throw new Error('photo_too_large');
    return `data:${contentType};base64,${toBase64(image)}`;
}

async function analyzePhoto(ai, image) {
    const result = await ai.run(PHOTO_AI_MODEL, {
        messages: [
            {
                role: 'system',
                content: '여행 사진 분류기입니다. 보이는 정보만 사용하고 사람의 신원, 민감정보, 정확한 장소는 추측하지 마세요. 한국어로 간결하게 답하세요.'
            },
            {
                role: 'user',
                content: '검색과 추천에 쓸 태그 최대 10개, 한 문장 요약, 장면 분류, 분위기 최대 3개를 반환하세요. 설명이나 마크다운 없이 {"tags":["태그"],"summary":"요약","scene":"other","moods":["분위기"]} 형식의 JSON 객체만 출력하세요. scene은 beach, city, desert, forest, indoor, lake, landmark, mountain, night, other, park, road, snow, village 중 하나여야 합니다.'
            }
        ],
        image,
        max_tokens: 300,
        temperature: 0.1
    });
    return normalizePhotoAiAnalysis(parseAiPayload(result));
}

function isLicenseError(error) {
    return /license|acceptable use|agree/i.test(String(error?.message || error));
}

export async function onRequestPost({ request, env }) {
    const fetchSite = request.headers.get('Sec-Fetch-Site');
    if (fetchSite && !['same-origin', 'same-site'].includes(fetchSite)) {
        return json({ error: 'forbidden' }, 403);
    }

    const token = getBearerToken(request);
    if (!token) return json({ error: 'unauthorized' }, 401);

    let payload;
    try {
        payload = await request.json();
    } catch {
        return json({ error: 'invalid_request' }, 400);
    }

    const photoId = String(payload?.photoId || '').trim();
    if (!photoId || photoId.length > 128) return json({ error: 'invalid_photo_id' }, 400);

    const user = await fetchCurrentUser(token);
    if (!user?.id) return json({ error: 'unauthorized' }, 401);

    let photo;
    try {
        photo = await fetchOwnedPhoto(token, user.id, photoId);
    } catch {
        return json({ error: 'photo_lookup_failed' }, 502);
    }
    if (!photo) return json({ error: 'photo_not_found' }, 404);

    if (photo.ai_analysis_status === 'complete') {
        return json({
            cached: true,
            analysis: getStoredAnalysis(photo),
            photo
        });
    }
    if (photo.ai_analysis_status === 'processing') {
        return json({ error: 'analysis_in_progress' }, 409);
    }
    if (!env.AI) return json({ error: 'ai_unavailable' }, 503);

    try {
        const dailyCount = await getDailyAnalysisCount(token, user.id);
        if (dailyCount >= DAILY_ANALYSIS_LIMIT) {
            return json({ error: 'daily_limit', limit: DAILY_ANALYSIS_LIMIT }, 429);
        }

        await updatePhotoAnalysis(token, user.id, photoId, {
            ai_analysis_status: 'processing'
        });
        const image = await downloadPhoto(token, photo.storage_path);
        const analysis = await analyzePhoto(env.AI, image);
        if (!analysis.tags.length && !analysis.summary) throw new Error('empty_ai_response');

        const analyzedAt = new Date().toISOString();
        const updatedPhoto = await updatePhotoAnalysis(token, user.id, photoId, {
            ai_tags: analysis.tags,
            ai_summary: analysis.summary,
            ai_scene: analysis.scene,
            ai_moods: analysis.moods,
            ai_analysis_status: 'complete',
            ai_analyzed_at: analyzedAt,
            ai_analysis_model: `${PHOTO_AI_MODEL}@${PHOTO_AI_ANALYSIS_VERSION}`
        });
        return json({ cached: false, analysis, photo: updatedPhoto });
    } catch (error) {
        await updatePhotoAnalysis(token, user.id, photoId, {
            ai_analysis_status: 'failed'
        }).catch(() => null);
        if (isLicenseError(error)) return json({ error: 'license_required' }, 503);
        return json({ error: 'analysis_failed' }, 502);
    }
}
