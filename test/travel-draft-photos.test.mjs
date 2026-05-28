import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getDraftPhotoCount,
    getTravelDraftPhotos,
    getTravelDraftPhotoIds
} from '../js/travel-draft-photos.mjs';

const demos = [
    { name: 'Demo 1', url: 'demo-1.jpg' },
    { name: 'Demo 2', url: 'demo-2.jpg' }
];

test('getTravelDraftPhotos prefers staged photos', () => {
    const staged = [{ name: 'staged', url: 'blob://1' }];
    const saved = [{ id: 'saved-1', name: 'saved', url: 'saved.jpg' }];

    assert.deepEqual(getTravelDraftPhotos({ staged, saved, demos }), staged);
});

test('getTravelDraftPhotos falls back to saved photos before demo photos', () => {
    const saved = [{ id: 'saved-1', name: 'saved', url: 'saved.jpg' }];

    assert.deepEqual(getTravelDraftPhotos({ staged: [], saved, demos }), saved);
});

test('getTravelDraftPhotoIds prefers last saved ids and then saved photo ids', () => {
    const saved = [{ id: 'saved-1' }, { id: 'saved-2' }];

    assert.deepEqual(getTravelDraftPhotoIds({ lastSavedPhotoIds: ['last-1'], saved }), ['last-1']);
    assert.deepEqual(getTravelDraftPhotoIds({ lastSavedPhotoIds: [], saved }), ['saved-1', 'saved-2']);
});

test('getDraftPhotoCount counts real draft photos before demo fallback', () => {
    assert.equal(getDraftPhotoCount({ staged: [{ name: 'a' }], saved: [], demos }), 1);
    assert.equal(getDraftPhotoCount({ staged: [], saved: [{ id: 'saved-1' }], demos }), 1);
    assert.equal(getDraftPhotoCount({ staged: [], saved: [], demos }), 2);
});
