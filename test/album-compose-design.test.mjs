import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app = readFileSync('js/app.js', 'utf8');
test('album composition preserves entered text across photo selection and renders all selected photos', () => {
    assert.match(app, /state\.albumComposeDraft\?\.title/);
    assert.match(app, /state\.albumComposeDraft = \{ title:/);
    const render = app.slice(app.indexOf('function renderTravelDraftSurfaces'), app.indexOf('function setVisibilityMode'));
    assert.doesNotMatch(render, /day\.photos\.slice\(0, 6\)/);
    assert.match(render, /아직 담은 사진이 없어요/);
    assert.doesNotMatch(render, /class="album-map-pin pin-/);
});
test('album composer uses Korean section labels and privacy controls expose selected state', () => {
    const render = app.slice(app.indexOf('function renderAlbumComposePage'), app.indexOf('function getAlbumPhotoDayGroups'));
    assert.doesNotMatch(render, /Album Builder|Album Photos/);
    assert.match(render, /aria-pressed=/);
    assert.match(render, /<details class="album-compose-map"/);
});
test('album save prevents duplicate requests and publishes local state only after linking photos', () => {
    const save = app.slice(app.indexOf('async function saveAlbumAndOpenDetail'), app.indexOf('function getDraftAlbumInput'));
    assert.ok(save.indexOf('replaceAlbumPhotos') < save.indexOf('state.savedAlbums ='));
    assert.match(app, /if \(saveAlbumButton\.disabled\) return;/);
    assert.match(app, /saveAlbumButton\.disabled = true;/);
    assert.match(app, /finally\s*\{\s*saveAlbumButton\.disabled = false;/);
});
