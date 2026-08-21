export const AI_ALBUM_ANALYSIS_SCHEMA_VERSION = '1';

export function getAiAlbumAnalysisAvailability({ enabled = false, endpoint = '' } = {}) {
    if (!enabled) {
        return Object.freeze({
            status: 'planned',
            label: '준비 중',
            canAnalyze: false
        });
    }

    if (!String(endpoint).trim()) {
        return Object.freeze({
            status: 'unavailable',
            label: '연결 필요',
            canAnalyze: false
        });
    }

    return Object.freeze({
        status: 'ready',
        label: '사용 가능',
        canAnalyze: true
    });
}

export function buildAiAlbumAnalysisRequest(photos = [], { locale = 'ko-KR' } = {}) {
    return {
        schemaVersion: AI_ALBUM_ANALYSIS_SCHEMA_VERSION,
        locale,
        photos: photos.map((photo, index) => ({
            sourceId: String(photo?.id || photo?.localId || `photo-${index + 1}`),
            capturedAt: photo?.date || photo?.capturedAt || null,
            location: Number.isFinite(Number(photo?.lat)) && Number.isFinite(Number(photo?.lng))
                ? { lat: Number(photo.lat), lng: Number(photo.lng) }
                : null,
            mediaType: photo?.type || photo?.mimeType || null
        }))
    };
}
