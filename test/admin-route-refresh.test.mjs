import test from 'node:test';
import assert from 'node:assert/strict';
import { getSharedRouteState } from '../js/share-link.mjs';
test('administrator routes survive shared hash parsing and direct refresh', () => {
    for (const route of ['admin-landing', 'admin-accounts', 'admin-feedback']) {
        assert.equal(getSharedRouteState(`#/${route}`).route, route);
    }
});
