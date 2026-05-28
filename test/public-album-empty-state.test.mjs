import test from 'node:test';
import assert from 'node:assert/strict';

import { getPublicAlbumEmptyState } from '../js/public-album-empty-state.mjs';

test('getPublicAlbumEmptyState gives neutral copy for empty public explore surfaces', () => {
    assert.deepEqual(getPublicAlbumEmptyState(), {
        title: '공개된 여행이 없습니다',
        body: '공개 또는 링크 공유로 저장한 앨범이 생기면 이곳에 표시됩니다.',
        meta: '0 photos · 0 places'
    });
});
