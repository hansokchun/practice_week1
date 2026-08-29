import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

import {
    PHOTO_AI_ANALYSIS_VERSION,
    normalizePhotoAiAnalysis
} from '../js/photo-ai-analysis.mjs';

const root = new URL('../', import.meta.url);
const migrationsDirectory = new URL('../supabase/migrations/', import.meta.url);

test('photo AI analysis keeps a compact safe Korean tag contract', () => {
    assert.equal(PHOTO_AI_ANALYSIS_VERSION, '1');
    assert.deepEqual(normalizePhotoAiAnalysis({
        tags: [' 바다 ', '여행', '바다', '', '노을', '풍경', '휴양', '해변', '자연', '여름', '산책', '추가'],
        summary: '  노을이 비치는 해변 풍경입니다.  ',
        scene: 'BEACH',
        moods: [' 평온함 ', '따뜻함', '평온함', '여유', '초과'],
        place: '부산 해운대'
    }), {
        tags: ['바다', '여행', '노을', '풍경', '휴양', '해변', '자연', '여름', '산책', '추가'],
        summary: '노을이 비치는 해변 풍경입니다.',
        scene: 'beach',
        moods: ['평온함', '따뜻함', '여유']
    });
});

test('Cloudflare photo analysis endpoint authenticates ownership and limits cost', () => {
    const source = readFileSync(new URL('functions/api/analyze-photo.js', root), 'utf8');
    const wrangler = readFileSync(new URL('wrangler.toml', root), 'utf8');

    assert.match(wrangler, /\[ai\][\s\S]*binding\s*=\s*"AI"/);
    assert.match(source, /PHOTO_AI_VISION_MODEL/);
    assert.match(source, /PHOTO_AI_STRUCTURE_MODEL/);
    assert.match(source, /task:\s*'query'/);
    assert.match(source, /response_format:[\s\S]*type:\s*'json_schema'/);
    assert.match(source, /\/auth\/v1\/user/);
    assert.match(source, /owner_id=eq\./);
    assert.match(source, /storage\/v1\/object\/authenticated\/photos/);
    assert.match(source, /DAILY_ANALYSIS_LIMIT\s*=\s*30/);
    assert.match(source, /processingAge[\s\S]*10 \* 60 \* 1000/);
    assert.match(source, /ai_analysis_status:\s*'processing',[\s\S]*ai_analyzed_at:/);
    assert.match(source, /ai_analysis_status === 'failed'/);
    assert.match(source, /ai_analysis_status:\s*'complete'/);
    assert.match(source, /ai_tags:/);
    assert.match(source, /ai_analyzed_at:/);
    assert.match(source, /Cache-Control': 'no-store'/);
    assert.doesNotMatch(source, /service[_-]?role|sb_secret_/i);
});

test('photo AI migration stores searchable analysis on owner-protected photo rows', () => {
    const migrationName = readdirSync(migrationsDirectory)
        .find((name) => name.endsWith('_add_photo_ai_analysis.sql'));
    assert.ok(migrationName, 'photo AI analysis migration is required');
    const sql = readFileSync(new URL(migrationName, migrationsDirectory), 'utf8');

    assert.match(sql, /alter table public\.photos[\s\S]*add column if not exists ai_tags text\[\]/i);
    assert.match(sql, /add column if not exists ai_summary text/i);
    assert.match(sql, /add column if not exists ai_scene text/i);
    assert.match(sql, /add column if not exists ai_moods text\[\]/i);
    assert.match(sql, /add column if not exists ai_analysis_status text/i);
    assert.match(sql, /add column if not exists ai_analyzed_at timestamp with time zone/i);
    assert.match(sql, /add column if not exists ai_analysis_model text/i);
    assert.match(sql, /ai_analysis_status[^;]+pending[^;]+processing[^;]+complete[^;]+failed/is);
    assert.match(sql, /create index[^;]+using gin \(ai_tags\)/i);
    assert.doesNotMatch(sql, /create policy|service[_-]?role|security definer/i);
});

test('web upload queues non-blocking AI analysis and hydrates tags for search', () => {
    const auth = readFileSync(new URL('auth.js', root), 'utf8');
    const app = readFileSync(new URL('js/app.js', root), 'utf8');
    const html = readFileSync(new URL('index.html', root), 'utf8');

    assert.match(auth, /PHOTO_SELECT_COLUMNS[^\n]+ai_tags,ai_summary,ai_scene,ai_moods,ai_analysis_status,ai_analyzed_at,ai_analysis_model/);
    assert.match(auth, /export async function requestPhotoAiAnalysis\(photoId\)/);
    assert.match(app, /function queuePhotoAiAnalysis\(photos/);
    assert.match(app, /Promise\.allSettled/);
    assert.match(app, /tags:\s*Array\.isArray\(photo\.ai_tags\)/);
    assert.match(app, /queuePhotoAiAnalysis\(saved\)/);
    assert.match(app, /queuePhotoAiAnalysis\(state\.savedPhotos\.filter/);
    assert.match(html, /id="photo-detail-ai-analysis"/);
    assert.match(html, /id="photo-detail-ai-summary"/);
    assert.match(html, /id="photo-detail-ai-tags"/);
    assert.match(app, /aiAnalysisPanel\.hidden = !canEdit/);
    assert.match(app, /photo\.ai_analysis_status === 'complete'/);
});
