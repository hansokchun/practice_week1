import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { getPhotoPage } from '../js/photo-pagination.mjs';
import { shouldRefreshPhotoSignedUrl } from '../js/photo-signed-url-freshness.mjs';
import { savePersonalPhotoSort, sortPersonalPhotos } from '../js/photo-sorting.mjs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('changing sort returns to page one while preserving selection and remembering the account preference', () => {
    const values = new Map();
    const storage = { setItem: (key, value) => values.set(key, value) };
    const state = { currentUser: { id: 'owner' }, personalPhotoPage: 3, selectedPersonalPhotoIds: ['selected'] };
    const calls = [];
    const body = app.slice(app.indexOf('function changePersonalPhotoSort'), app.indexOf('async function refreshVisiblePhotoPageUrls'));
    const change = runInNewContext(`${body}; changePersonalPhotoSort`, {
        state, savePersonalPhotoSort,
        window: { localStorage: storage },
        renderPersonalPhotosPage: () => calls.push('render'),
        refreshVisiblePhotoPageUrls: (...args) => calls.push(args)
    });
    change('taken-newest');
    assert.equal(state.personalPhotoSort, 'taken-newest');
    assert.equal(state.personalPhotoPage, 1);
    assert.deepEqual(state.selectedPersonalPhotoIds, ['selected']);
    assert.equal(values.get('ikkyee:photo-sort:owner'), 'taken-newest');
    assert.deepEqual(calls, ['render', ['personal', 1]]);
    state.currentUser = null;
    change('taken-oldest');
    assert.equal(state.personalPhotoSort, 'taken-newest');
});

for (const changedDuringRefresh of [false, true]) {
    test(`signed URL refresh targets the sorted page${changedDuringRefresh ? ' and ignores a stale sort response' : ''}`, async () => {
        const state = {
            personalPhotoSort: 'taken-newest', personalPhotoPage: 1,
            savedPhotos: Array.from({ length: 20 }, (_, index) => ({
                id: String(index), date: new Date(Date.UTC(2026, 0, index + 1)).toISOString(), storage_path: `owner/${index}.jpg`,
                url: '/expired.jpg', signed_url_expires_at: 1
            }))
        };
        let requestedIds;
        let renders = 0;
        const body = app.slice(app.indexOf('async function refreshVisiblePhotoPageUrls'), app.indexOf('function renderPersonalPhotosPage'));
        const refresh = runInNewContext(`${body}; refreshVisiblePhotoPageUrls`, {
            state, sortPersonalPhotos, getPhotoPage, shouldRefreshPhotoSignedUrl,
            getMySavedPhotos: () => state.savedPhotos,
            hydratePhotoUrls: async items => {
                requestedIds = items.map(photo => photo.id);
                if (changedDuringRefresh) state.personalPhotoSort = 'taken-oldest';
                return { data: items.map(photo => ({ ...photo, url: '/fresh.jpg', signed_url_expires_at: Date.now() + 900000 })) };
            },
            renderPersonalPhotosPage: () => { renders++; }
        });
        await refresh('personal', 1);
        assert.deepEqual(requestedIds, Array.from({ length: 16 }, (_, index) => String(19 - index)));
        assert.equal(renders, changedDuringRefresh ? 0 : 1);
        assert.equal(state.savedPhotos.find(photo => photo.id === '19').url, '/fresh.jpg');
        assert.equal(state.savedPhotos.find(photo => photo.id === '0').url, '/expired.jpg');
    });
}

test('the personal photo sort control exposes only three named orders and is wired to the renderer', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const menu = html.slice(html.indexOf('<select id="personal-photo-sort"'), html.indexOf('</select>', html.indexOf('<select id="personal-photo-sort"')));
    for (const value of ['uploaded-newest', 'taken-newest', 'taken-oldest']) {
        assert.ok(menu.includes(`value="${value}"`));
    }
    assert.equal((menu.match(/<option /g) || []).length, 3);
    assert.match(menu, /<option value="uploaded-newest">등록 순<\/option>/);
    assert.doesNotMatch(menu, /uploaded-oldest|most-liked|등록 최신순|좋아요/);
    assert.match(menu, /aria-label="사진 정렬"/);
    assert.match(app, /personal-photo-sort'\)\?\.addEventListener\('change',[\s\S]*changePersonalPhotoSort\(event\.currentTarget\.value\)/);
    assert.match(app, /getPhotoPage\(sortPersonalPhotos\(photos, state\.personalPhotoSort\), state\.personalPhotoPage\)/);
});
