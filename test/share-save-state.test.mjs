import test from 'node:test';
import assert from 'node:assert/strict';

import { getShareSaveControlState } from '../js/share-save-state.mjs';

test('getShareSaveControlState disables share save controls while saving', () => {
    assert.deepEqual(getShareSaveControlState(true), {
        disabled: true,
        saveLabel: '저장 중'
    });
});

test('getShareSaveControlState enables share save controls when idle', () => {
    assert.deepEqual(getShareSaveControlState(false), {
        disabled: false,
        saveLabel: '설정 저장'
    });
});
