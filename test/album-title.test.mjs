import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import { getAlbumDisplayTitle, normalizeAlbumTitle } from '../js/album-title.mjs';

const app = readFileSync('js/app.js', 'utf8');
function source(name) {
    const match = new RegExp(`^(?:async )?function ${name}\\(`, 'm').exec(app);
    assert.ok(match, name);
    const rest = app.slice(match.index);
    return rest.slice(0, rest.indexOf('\n}') + 2);
}

test('optional album titles preserve empty values without persisting a display label', () => {
    for (const value of ['', '  \n ', null, undefined]) {
        assert.equal(normalizeAlbumTitle(value), '');
        assert.equal(getAlbumDisplayTitle(value), '제목 없는 앨범');
    }
    assert.equal(normalizeAlbumTitle('  부산 여행  '), '부산 여행');
    assert.equal(getAlbumDisplayTitle('  부산 여행  '), '부산 여행');
});

test('inline album editing can clear an existing title and retain story metadata', async () => {
    const album = { id: 'a1', owner_id: 'owner', title: '여행', note: 'story', visibility: 'private' };
    const state = { currentUser: { id: 'owner' }, albumDetailPhotos: [{ id: 'p1' }], savedPhotos: [], albumDetailEditMode: true };
    const calls = [];
    const save = runInNewContext(`${source('saveSelectedAlbumTextEdits')}; saveSelectedAlbumTextEdits`, {
        state, normalizeAlbumTitle, getSelectedPublicAlbum: () => album,
        $: () => ({ value: '  ' }), collectAlbumStoryEntriesFromDOM: () => ['story'],
        getAlbumVisibleNote: () => '원래 설명',
        serializeAlbumNoteWithStory: (note, entries) => `${note}|${entries.join(',')}`,
        updateAlbum: async (id, payload) => { calls.push(payload); return { data: { ...album, ...payload } }; },
        updateSavedAlbumLocally: (_, payload) => calls.push(payload), normalizeSavedAlbum: album => album,
        renderSavedPhotoSurfaces() {}, renderPublicSurfaces() {}, showToast() {}
    });
    await save();
    assert.equal(calls[0]?.title, '');
    assert.equal(calls[0]?.note, '원래 설명|story');
    assert.equal(state.albumDetailEditMode, false);
});

test('explicitly empty draft input does not revive a previous title', () => {
    const getDraft = runInNewContext(`${source('getDraftAlbumInput')}; getDraftAlbumInput`, {
        state: { albumDrafts: [{ name: '이전 이름', note: '' }] },
        normalizeAlbumTitle, $: () => ({ value: '' })
    });
    assert.equal(getDraft().name, '');
});

test('untitled albums use ids and never collect unrelated unassigned photos', () => {
    const state = {
        currentUser: { id: 'owner' },
        savedAlbums: [{ id: 'a1', owner_id: 'owner', title: '', visibility: 'private' }, { id: 'a2', owner_id: 'owner', title: '', visibility: 'private' }],
        savedPhotos: [
            { id: 'p1', owner_id: 'owner', album_id: 'a1', album: '', visibility: 'private' },
            { id: 'p2', owner_id: 'owner', album_id: 'a2', album: '', visibility: 'private' },
            { id: 'unassigned', owner_id: 'owner', album: '', visibility: 'private' },
            { id: 'other', owner_id: 'other', album: '', visibility: 'public' }
        ]
    };
    const getAlbums = runInNewContext(`${source('getSavedPublicAlbums')}; getSavedPublicAlbums`, {
        state, isAlbumPhotoRemoved: () => false, hasPhotoLocation: () => false,
        getDraftPhotos: () => [], MAIN_BG_2_URL: 'fallback'
    });
    assert.deepEqual(Array.from(getAlbums(), album => Array.from(album.photos, p => p.id)), [['p1'], ['p2']]);
});

test('blank titles retain accessible labels in album lists but do not create a visible detail heading', () => {
    assert.match(source('renderSavedAlbumRows'), /getAlbumDisplayTitle\(album\.title\)/);
    assert.match(source('renderPublicSurfaces'), /tripTitle\.classList\.toggle\('is-untitled', !albumTitle\)/);
    assert.match(source('renderAlbumComposePage'), /앨범 이름[\s\S]*선택/);
});
