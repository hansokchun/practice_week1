import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { PHOTO_PAGE_SIZE, getPhotoPage } from '../js/photo-pagination.mjs';

test('photo lists show sixteen items per page', () => {
    const photos = Array.from({ length: 35 }, (_, index) => ({ id: index + 1 }));
    const first = getPhotoPage(photos, 1);
    const second = getPhotoPage(photos, 2);
    const last = getPhotoPage(photos, 3);

    assert.equal(PHOTO_PAGE_SIZE, 16);
    assert.deepEqual(first.items.map(({ id }) => id), Array.from({ length: 16 }, (_, index) => index + 1));
    assert.deepEqual(second.items.map(({ id }) => id), Array.from({ length: 16 }, (_, index) => index + 17));
    assert.deepEqual(last.items.map(({ id }) => id), [33, 34, 35]);
});

test('photo pagination clamps a stale page after items are removed', () => {
    const photos = Array.from({ length: 17 }, (_, index) => ({ id: index + 1 }));
    const page = getPhotoPage(photos.slice(0, 16), 2);

    assert.equal(page.currentPage, 1);
    assert.equal(page.shouldPaginate, false);
    assert.equal(page.hasPrevious, false);
    assert.equal(page.hasNext, false);
});

test('personal and liked pages expose independent pagination controls', () => {
    const html = readFileSync('index.html', 'utf8');
    const app = readFileSync('js/app.js', 'utf8');

    assert.match(html, /id="personal-photo-pagination"/);
    assert.match(html, /id="liked-photo-pagination"/);
    assert.match(app, /personalPhotoPage:/);
    assert.match(app, /likedPhotoPage:/);
    assert.match(app, /renderPhotoPagination\(pagination, personalPage, 'personal'\)/);
    assert.match(app, /renderPhotoPagination\(pagination, likedPage, 'liked'\)/);
    assert.match(app, /data-photo-page="\$\{pageKey\}"/);
});
