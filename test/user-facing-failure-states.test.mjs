import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
    getLibraryFailureState,
    getMapUnavailableState,
    getUploadFailureState
} from '../js/user-facing-failure-states.mjs';

const appSource = () => readFileSync('js/app.js', 'utf8');

test('library failures stay distinct from empty states and offer a retry', () => {
    assert.deepEqual(getLibraryFailureState('photos', { online: false }), {
        title: '사진을 불러오지 못했습니다.',
        body: '인터넷 연결을 확인한 뒤 다시 시도해주세요.',
        action: '다시 시도'
    });
    assert.equal(getLibraryFailureState('likes').action, '다시 시도');
    assert.equal(getLibraryFailureState('albums').action, '다시 시도');
});

test('upload failures use safe copy without backend details', () => {
    const offline = getUploadFailureState({ online: false });
    const online = getUploadFailureState({ online: true });

    assert.match(offline.body, /인터넷 연결/);
    assert.match(online.body, /로컬 초안은 그대로 유지/);
    assert.doesNotMatch(`${offline.title} ${offline.body} ${online.title} ${online.body}`, /supabase|storage|bucket|rls|jwt/i);
});

test('map failures avoid developer configuration instructions', () => {
    const state = getMapUnavailableState();

    assert.equal(state.title, '지도를 불러오지 못했습니다.');
    assert.match(state.body, /사진 목록은 계속 이용/);
    assert.doesNotMatch(`${state.title} ${state.body}`, /api|vite|환경변수|키/i);
});

test('app renders retryable library failures and never shows raw upload errors', () => {
    const source = appSource();
    const uploadStart = source.indexOf('async function persistStagedPhotos()');
    const uploadEnd = source.indexOf('async function saveAlbumDraft()', uploadStart);
    const uploadBody = source.slice(uploadStart, uploadEnd);

    assert.match(source, /savedPhotosLoadError:\s*false/);
    assert.match(source, /savedAlbumsLoadError:\s*false/);
    assert.match(source, /myLikesLoadError:\s*false/);
    assert.match(source, /data-retry-saved-library/);
    assert.match(source, /loadSavedLibrary\(\)/);
    assert.doesNotMatch(uploadBody, /status\.textContent = error\.message/);
    assert.match(uploadBody, /getUploadFailureState\(\{ online: navigator\.onLine \}\)/);
});
