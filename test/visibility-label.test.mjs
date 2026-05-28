import test from 'node:test';
import assert from 'node:assert/strict';

import { getVisibilityLabel, getVisibilityStatusText } from '../js/visibility-label.mjs';

test('getVisibilityLabel returns Korean labels for supported modes', () => {
    assert.equal(getVisibilityLabel('private'), '비공개');
    assert.equal(getVisibilityLabel('link'), '링크 공유');
    assert.equal(getVisibilityLabel('public'), '공개');
});

test('getVisibilityStatusText formats the current sharing status', () => {
    assert.equal(getVisibilityStatusText('public'), '현재 상태: 공개');
    assert.equal(getVisibilityStatusText('unknown'), '현재 상태: 비공개');
});
