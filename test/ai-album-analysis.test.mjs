import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    AI_ALBUM_ANALYSIS_SCHEMA_VERSION,
    buildAiAlbumAnalysisRequest,
    getAiAlbumAnalysisAvailability
} from '../js/ai-album-analysis.mjs';

test('AI album analysis stays planned until an approved backend is enabled', () => {
    assert.deepEqual(getAiAlbumAnalysisAvailability(), {
        status: 'planned',
        label: '준비 중',
        canAnalyze: false
    });
    assert.equal(getAiAlbumAnalysisAvailability({ enabled: true }).status, 'unavailable');
    assert.equal(getAiAlbumAnalysisAvailability({ enabled: true, endpoint: '/api/album-analysis' }).canAnalyze, true);
});

test('AI album analysis request contains metadata only and no browser URLs or binaries', () => {
    const request = buildAiAlbumAnalysisRequest([{
        id: 'saved-1',
        date: '2026-08-21T04:00:00.000Z',
        lat: '37.55',
        lng: '126.98',
        type: 'image/jpeg',
        url: 'blob:private-photo',
        file: new Uint8Array([1, 2, 3])
    }]);

    assert.equal(request.schemaVersion, AI_ALBUM_ANALYSIS_SCHEMA_VERSION);
    assert.deepEqual(request.photos, [{
        sourceId: 'saved-1',
        capturedAt: '2026-08-21T04:00:00.000Z',
        location: { lat: 37.55, lng: 126.98 },
        mediaType: 'image/jpeg'
    }]);
    assert.doesNotMatch(JSON.stringify(request), /blob:|private-photo|file/);
});

test('album builder keeps the future AI service out of the current product UI', () => {
    const app = readFileSync('js/app.js', 'utf8');
    assert.doesNotMatch(app, /data-ai-album-status/);
    assert.doesNotMatch(app, /id="btn-ai-album-analysis"/);
    assert.doesNotMatch(app, /AI 앨범 초안/);
});
