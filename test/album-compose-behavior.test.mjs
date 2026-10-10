import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const app = readFileSync('js/app.js', 'utf8');
function source(name) {
    const match = new RegExp(`^(?:async )?function ${name}\\(`, 'm').exec(app);
    assert.ok(match);
    const rest = app.slice(match.index);
    return rest.slice(0, rest.indexOf('\n}') + 2);
}

function saveHarness(linkError = null) {
    const state = { currentUser: { id: 'owner' }, savedAlbums: [], savedPhotos: [{ id: 'p1', visibility: 'private' }], albumBuilderPhotoIds: ['p1'], visibility: 'public', albumComposeDraft: { title: '여행', note: '기록' } };
    const calls = [];
    const save = runInNewContext(`${source('saveAlbumAndOpenDetail')}; saveAlbumAndOpenDetail`, {
        state,
        $: selector => ({ value: selector === '#album-name-input' ? '여행' : '기록' }),
        serializeAlbumNoteWithStory: note => note, parseAlbumStoryEntries: () => [],
        getAlbumCandidatePhotos: () => state.savedPhotos,
        createAlbum: async payload => { calls.push(['create', payload]); return { data: { id: 'a1', ...payload } }; },
        normalizeSavedAlbum: album => album,
        replaceAlbumPhotos: async (id, ids) => { calls.push(['attach', id, [...ids]]); return { error: linkError }; },
        deleteAlbum: async id => calls.push(['delete', id]),
        loadPublicProfileNames: async () => {}, renderSavedPhotoSurfaces: () => {}, renderPublicSurfaces: () => {},
        showToast: message => calls.push(['toast', message]), routeToTrip: id => calls.push(['route', id])
    });
    return { state, calls, save };
}

test('saving a public album attaches selected photos without publishing private photos', async () => {
    const h = saveHarness();
    await h.save();
    assert.deepEqual(h.calls.find(c => c[0] === 'attach'), ['attach', 'a1', ['p1']]);
    assert.equal(h.state.savedPhotos[0].visibility, 'private');
    assert.equal(h.state.savedAlbums[0].visibility, 'public');
    assert.equal(h.state.albumComposeDraft, null);
    assert.ok(h.calls.some(c => c[0] === 'route' && c[1] === 'a1'));
});

test('failed photo attachment keeps the draft and removes the incomplete new album', async () => {
    const h = saveHarness(new Error('offline'));
    await h.save();
    assert.equal(h.state.savedAlbums.length, 0);
    assert.equal(h.state.albumComposeDraft.title, '여행');
    assert.ok(h.calls.some(c => c[0] === 'delete' && c[1] === 'a1'));
    assert.equal(h.calls.some(c => c[0] === 'route'), false);
});

test('all photos from one day are rendered, and a locationless album has no fake map pin', () => {
    const photos = Array.from({ length: 9 }, (_, i) => ({ id: `p${i}`, date: '2026-10-01', lat: null, lng: null }));
    const nodes = { '#album-day-photo-list': {}, '#page-album .album-compose-map': {} };
    const render = runInNewContext(`${source('getAlbumPhotoDayGroups')}\n${source('renderTravelDraftSurfaces')}; renderTravelDraftSurfaces`, {
        state: { stagedPhotos: [], albumDrafts: [] }, $: selector => nodes[selector] || null,
        getDraftPhotos: () => photos, getAlbumCandidatePhotos: () => photos, getMySavedPhotos: () => photos,
        getDemoDraftPhotos: () => [], getDraftPhotoCount: () => photos.length, getTravelSummary: () => ({}),
        hasPhotoLocation: photo => photo.lat != null && photo.lng != null,
        formatPhotoPlaceMeta: count => `${count}장`, escapeHtml: String, renderPhotoImage: photo => `<img alt="${photo.id}">`
    });
    render();
    assert.equal((nodes['#album-day-photo-list'].innerHTML.match(/<figure>/g) || []).length, 9);
    assert.equal(nodes['#page-album .album-compose-map'].hidden, true);
});
