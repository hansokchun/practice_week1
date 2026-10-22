import assert from 'node:assert/strict';
import test from 'node:test';

import {
    dismissFirstPhotoInvitation,
    getContributionInsertIndex,
    getUploadCompletionGuidance,
    loadFirstPhotoInvitationDismissed,
    shouldShowFirstPhotoInvitation
} from '../js/photo-contribution.mjs';

function createStorage() {
    const values = new Map();
    return {
        getItem(key) {
            return values.get(key) ?? null;
        },
        setItem(key, value) {
            values.set(key, value);
        },
        values
    };
}

test('first-photo invitation appears only for a signed-in account with a successful empty library', () => {
    const readyEmptyLibrary = {
        userId: 'member-1',
        hasLoadedPhotos: true,
        loadError: null,
        photoCount: 0,
        dismissed: false
    };

    assert.equal(shouldShowFirstPhotoInvitation(readyEmptyLibrary), true);
    assert.equal(shouldShowFirstPhotoInvitation({ ...readyEmptyLibrary, userId: '' }), false);
    assert.equal(shouldShowFirstPhotoInvitation({ ...readyEmptyLibrary, hasLoadedPhotos: false }), false);
    assert.equal(shouldShowFirstPhotoInvitation({ ...readyEmptyLibrary, loadError: new Error('failed') }), false);
    assert.equal(shouldShowFirstPhotoInvitation({ ...readyEmptyLibrary, photoCount: 1 }), false);
    assert.equal(shouldShowFirstPhotoInvitation({ ...readyEmptyLibrary, dismissed: true }), false);
});

test('first-photo invitation dismissal is account-scoped and skips guests', () => {
    const storage = createStorage();

    assert.equal(loadFirstPhotoInvitationDismissed(storage, 'one'), false);
    assert.equal(dismissFirstPhotoInvitation(storage, 'one'), true);
    assert.equal(loadFirstPhotoInvitationDismissed(storage, 'one'), true);
    assert.equal(loadFirstPhotoInvitationDismissed(storage, 'two'), false);
    assert.equal(dismissFirstPhotoInvitation(storage, ''), false);
    assert.equal(storage.values.size, 1);
});

test('first-photo invitation dismissal tolerates unavailable storage', () => {
    const brokenStorage = {
        getItem() {
            throw new Error('storage unavailable');
        },
        setItem() {
            throw new Error('storage unavailable');
        }
    };

    assert.equal(loadFirstPhotoInvitationDismissed(brokenStorage, 'member-1'), false);
    assert.equal(dismissFirstPhotoInvitation(brokenStorage, 'member-1'), false);
    assert.equal(loadFirstPhotoInvitationDismissed(undefined, 'member-1'), false);
    assert.equal(dismissFirstPhotoInvitation(undefined, 'member-1'), false);
});

test('contribution card uses the requested one-based position between home sections', () => {
    assert.equal(getContributionInsertIndex(0), null);
    assert.equal(getContributionInsertIndex(1), null);
    assert.equal(getContributionInsertIndex(2), 1);
    assert.equal(getContributionInsertIndex(3), 2);
    assert.equal(getContributionInsertIndex(8), 2);
});

test('first upload guidance reports stored visibility and a located photo', () => {
    const guidance = getUploadCompletionGuidance(
        [{ id: 'first', visibility: 'public', lat: 37.5665, lng: 126.978 }],
        1
    );

    assert.equal(guidance.title, '첫 사진을 남겼어요!');
    assert.equal(guidance.summary, '1장의 사진을 공개로 저장했어요. 위치가 있는 사진은 내 지도에서 바로 볼 수 있어요.');
    assert.equal(guidance.hasLocatedPhotos, true);
});

test('later upload guidance counts mixed visibility and explains missing locations', () => {
    const guidance = getUploadCompletionGuidance(
        [
            { id: 'public', visibility: 'public', lat: null, lng: null },
            { id: 'private', visibility: 'private', lat: 0, lng: 0 },
            { id: 'legacy-public', shared: true, lat: 91, lng: 127 }
        ],
        7
    );

    assert.equal(guidance.title, '사진을 저장했어요!');
    assert.equal(guidance.summary, '공개 2장, 비공개 1장을 저장했어요. 위치를 추가하면 사진을 내 지도와 연결할 수 있어요.');
    assert.equal(guidance.hasLocatedPhotos, false);
});

test('upload guidance preserves explicit link visibility and does not call it private', () => {
    const guidance = getUploadCompletionGuidance(
        [{
            id: 'link-only',
            visibility: 'link',
            shared: true,
            lat: null,
            lng: null,
            location_assignment_skipped: true
        }],
        3
    );

    assert.match(guidance.summary, /링크 공유 1장/);
    assert.doesNotMatch(guidance.summary, /비공개/);
    assert.equal(guidance.hasLocatedPhotos, false);
});

test('upload guidance does not infer public or private from an invalid explicit visibility', () => {
    const guidance = getUploadCompletionGuidance(
        [{ id: 'unknown', visibility: null, shared: true, lat: null, lng: null }],
        3
    );

    assert.equal(guidance.summary, '1장의 사진을 저장했어요. 위치를 추가하면 사진을 내 지도와 연결할 수 있어요.');
});

test('upload guidance uses legacy shared flags only when visibility is absent', () => {
    const guidance = getUploadCompletionGuidance([
        { id: 'legacy-public', shared: true, lat: null, lng: null },
        { id: 'legacy-private', shared: false, lat: null, lng: null }
    ], 4);

    assert.match(guidance.summary, /공개 1장, 비공개 1장/);
});

test('empty upload guidance does not claim that a photo was saved', () => {
    const guidance = getUploadCompletionGuidance([], 0);

    assert.equal(guidance.title, '내 사진을 둘러보세요');
    assert.match(guidance.summary, /아직 저장된 사진이 없어요/);
    assert.equal(guidance.hasLocatedPhotos, false);
});

test('restored completion page keeps its copy neutral when the saved batch is unavailable', () => {
    const guidance = getUploadCompletionGuidance([], 4);

    assert.equal(guidance.title, '내 사진을 둘러보세요');
    assert.equal(guidance.summary, '저장한 사진은 내 보관함에서 확인할 수 있어요. 새로운 장소도 사진으로 남겨보세요.');
    assert.equal(guidance.hasLocatedPhotos, false);
});
