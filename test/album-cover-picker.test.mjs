import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getAlbumCoverCandidates, getAlbumCoverSelection } from '../js/album-cover-picker.mjs';

const album = { id: 'album', owner_id: 'owner', visibility: 'public' };
const photos = [
    { id: 'one', album_id: 'album', owner_id: 'owner', visibility: 'public', preview_url: 'https://cdn/one.jpg' },
    { id: 'two', album_id: 'album', owner_id: 'owner', visibility: 'public', url: 'https://cdn/two.jpg' },
    { id: 'private', album_id: 'album', owner_id: 'owner', visibility: 'private', url: 'https://cdn/private.jpg' },
    { id: 'other', album_id: 'other', owner_id: 'owner', visibility: 'public', url: 'https://cdn/other.jpg' }
];
test('cover choices belong to the selected album and expose public eligibility', () => {
    const candidates = getAlbumCoverCandidates(album, photos, 'owner');
    assert.deepEqual(candidates.map(p => p.id), ['one', 'two', 'private']);
    assert.deepEqual(candidates.map(p => p.coverSelectable), [true, true, false]);
    assert.deepEqual(getAlbumCoverCandidates(album, photos, 'another-user'), []);
});
test('any eligible member can become the cover, not only the first photo', () => {
    assert.equal(getAlbumCoverSelection(album, photos, 'owner', 'two')?.id, 'two');
    assert.equal(getAlbumCoverSelection(album, photos, 'owner', 'other'), null);
    assert.equal(getAlbumCoverSelection(album, photos, 'owner', 'private'), null);
    assert.equal(getAlbumCoverSelection({ ...album, visibility: 'link' }, photos, 'owner', 'private'), null);
    assert.equal(getAlbumCoverSelection({ ...album, visibility: 'private' }, photos, 'owner', 'private')?.id, 'private');
});
test('changing album visibility does not falsely publish its individual photos locally', () => {
    const source=readFileSync('js/app.js','utf8');
    const toggle=source.slice(source.indexOf('async function toggleSelectedAlbumVisibility()'),source.indexOf('function openAlbumCoverPicker()'));
    assert.doesNotMatch(toggle,/state\.savedPhotos\s*=/);
});
test('album cover UI uses the recoverable photo renderer and saves only the cover field', () => {
    const source = readFileSync('js/app.js', 'utf8');
    const html = readFileSync('index.html', 'utf8');
    assert.match(html, /id="album-cover-picker-modal"/);
    assert.match(source, /renderPhotoImage\(photo/);
    assert.match(source, /updateAlbumCover\(album.id/);
    assert.doesNotMatch(source, /setSelectedAlbumCoverFromFirstPhoto/);
    assert.match(readFileSync('auth.js', 'utf8'), /export async function updateAlbumCover/);
});
