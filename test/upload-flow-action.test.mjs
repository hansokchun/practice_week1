import test from 'node:test';
import assert from 'node:assert/strict';

import { getUploadNextRoute } from '../js/upload-flow-action.mjs';

test('getUploadNextRoute keeps upload flow on upload without selected photos', () => {
    assert.equal(getUploadNextRoute(0), 'upload');
});

test('getUploadNextRoute moves uploaded personal photos to individual photos', () => {
    assert.equal(getUploadNextRoute(3), 'photos');
});
