import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getLandingAdminDockPage, addLandingAdminPhoto } from '../js/landing-admin-dock.mjs';

test('dock pages cover every candidate without rendering all photos at once', () => {
    const photos = Array.from({ length: 19 }, (_, id) => ({ id }));
    const pages = [1, 2, 3].map(page => getLandingAdminDockPage(photos, page));
    assert.deepEqual(pages.flatMap(page => page.items), photos);
    assert.equal(pages[0].items.length, 8);
    assert.equal(pages[2].hasNext, false);
    assert.equal(getLandingAdminDockPage(photos.slice(0, 2), 3).currentPage, 1);
});
test('adding a photo preserves ordering and never toggles an existing photo off', () => {
    const original = ['a'];
    assert.deepEqual(addLandingAdminPhoto(original, 'b').photoIds, ['a', 'b']);
    assert.deepEqual(original, ['a']);
    assert.equal(addLandingAdminPhoto(original, 'a').status, 'unchanged');
    assert.equal(addLandingAdminPhoto(original, 'b', 1).status, 'full');
});
