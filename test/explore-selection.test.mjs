import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldOpenExplorePreview } from '../js/explore-selection.mjs';

test('shouldOpenExplorePreview opens preview for explore list items', () => {
    assert.equal(shouldOpenExplorePreview({ isTripLink: false, isExploreListItem: true }), true);
});

test('shouldOpenExplorePreview does not interrupt direct trip links', () => {
    assert.equal(shouldOpenExplorePreview({ isTripLink: true, isExploreListItem: true }), false);
});
