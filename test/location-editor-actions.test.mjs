import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { getLocationEditorPhoto, getLocationEditorCoordinateUpdate, hasCompleteLocation, normalizeLocationDraft } from '../js/location-workflow.mjs';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

function functionSource(name) {
    const match = new RegExp(`^(?:async )?function ${name}\\(`, 'm').exec(app);
    assert.ok(match, `${name} must exist`);
    const rest = app.slice(match.index);
    return rest.slice(0, rest.indexOf('\n}') + 2);
}

function editorHarness({ confirmed = true, deleteError = null } = {}) {
    const photo = { id: 'mine', owner_id: 'owner', url: 'signed-original', storage_path: 'owner/original.jpg', thumbnail_path: 'owner/thumbnails/mine.jpg', preview_path: 'owner/previews/mine.jpg' };
    const other = { id: 'other', owner_id: 'someone' };
    const state = {
        currentUser: { id: 'owner' }, savedPhotos: [photo, other],
        selectedPhotoId: 'mine', selectedLocationPhotoId: 'mine',
        selectedPersonalPhotoIds: ['mine', 'other'], lastSavedPhotoIds: ['mine'], likedPhotoIds: ['mine', 'other'],
        albumDetailPhotos: [photo, other], landingHeroPhotoIds: ['mine', 'other'],
        landingHeroLocationLabels: { mine: 'Seoul', other: 'Paris' },
        landingAssignments: [{ photo_id: 'mine' }, { photo_id: 'other' }],
        landingSections: [{ id: 'section', photo_ids: ['mine', 'other'] }],
        locationEditorHasPickedLocation: true, locationEditorDraftCoordinates: { lat: 37, lng: 127 }
    };
    const calls = [];
    const button = { disabled: false, hidden: false };
    const message = { textContent: '' };
    const context = vm.createContext({
        state, window: { confirm: () => { calls.push('confirm'); return confirmed; } },
        $: selector => selector === '#btn-delete-location-editor-photo' ? button : selector === '#location-editor-message' ? message : null,
        $$: () => [], document: { body: { dataset: { page: 'location-assign' }, classList: { remove: () => {} } } },
        getMySavedPhotos: () => state.savedPhotos.filter(p => p.owner_id === state.currentUser?.id),
        getLocationEditorPhoto, normalizeLocationDraft,
        deletePhoto: async (...args) => { calls.push(['delete', ...args]); return { error: deleteError }; },
        closeModals: () => calls.push('close'), openModal: selector => calls.push(['open', selector]),
        setLocationEditorPhoto: id => calls.push(['select', id]),
        showToast: text => calls.push(['toast', text]),
        renderSavedPhotoSurfaces: () => calls.push('saved'), renderTravelDraftSurfaces: () => calls.push('travel'),
        renderPublicSurfaces: () => calls.push('public'), renderLocationAssignmentPage: () => calls.push('assignment'),
        renderLandingHeroSlides: () => calls.push('hero'), renderLandingSections: () => calls.push('landing'),
        setExplorePhotoPreviewOpen: () => calls.push('preview'),
        getTripReviewPhotoId: p => String(p.id || p.localId || ''),
        loadSavedAlbums: async () => calls.push('albums')
    });
    return { state, photo, other, calls, button, message, context };
}

test('photo editor omits redundant location status and initial instruction', () => {
    assert.doesNotMatch(functionSource('syncLocationEditorPhotoState'), /위치가 지정된 사진/);
    assert.doesNotMatch(functionSource('setLocationEditorPhoto'), /의 위치를 직접 지정합니다/);
});

test('expanded map gets its own flexible row below the heading and photo summary', () => {
    const picker = css.match(/#location-editor-modal\.is-map-picking \.modal-card\s*\{([^}]+)\}/)?.[1];
    assert.match(picker, /grid-template-rows:\s*auto auto minmax\(0,\s*1fr\)/);
});

test('opening photo editor closes the detail overlay and selects the clicked owner photo', () => {
    const h = editorHarness();
    vm.runInContext(functionSource('openLocationEditor'), h.context);
    h.context.openLocationEditor({ currentTarget: { dataset: { photoId: 'mine' } } });
    assert.deepEqual(h.calls.slice(0, 3), ['close', ['open', '#location-editor-modal'], ['select', 'mine']]);
    h.calls.length = 0;
    h.context.openLocationEditor('other');
    assert.equal(h.calls.some(c => Array.isArray(c) && c[0] === 'open'), false, 'cannot edit another photo via fallback selection');
});

test('delete action is a separate button and cancellation preserves the photo and storage', async () => {
    assert.match(html, /id="btn-delete-location-editor-photo"[^>]*type="button"/);
    assert.match(app, /#btn-delete-location-editor-photo'\)\?\.addEventListener\('click', deleteLocationEditorPhoto\)/);
    const h = editorHarness({ confirmed: false });
    vm.runInContext(functionSource('deleteLocationEditorPhoto'), h.context);
    await h.context.deleteLocationEditorPhoto();
    assert.deepEqual(h.calls, ['confirm']);
    assert.equal(h.state.savedPhotos.length, 2);
});

test('photo editor deletion sends all storage variants and clears references after success', async () => {
    const h = editorHarness();
    vm.runInContext(functionSource('deleteLocationEditorPhoto'), h.context);
    await h.context.deleteLocationEditorPhoto();
    assert.deepEqual(h.calls.find(c => Array.isArray(c) && c[0] === 'delete'), ['delete', 'mine', 'signed-original', 'owner/original.jpg', 'owner/thumbnails/mine.jpg', 'owner/previews/mine.jpg']);
    assert.deepEqual(Array.from(h.state.savedPhotos, p => p.id), ['other']);
    for (const key of ['selectedPersonalPhotoIds', 'likedPhotoIds', 'landingHeroPhotoIds']) assert.deepEqual(Array.from(h.state[key]), ['other']);
    assert.equal(h.state.selectedPhotoId, null);
    assert.equal(h.state.selectedLocationPhotoId, null);
    assert.equal(h.state.locationEditorDraftCoordinates, null);
    assert.deepEqual(Array.from(h.state.landingSections[0].photo_ids), ['other']);
    assert.ok(h.calls.includes('close'));
    assert.ok(h.calls.includes('albums'), 'reload the atomically repaired album cover and count');
    assert.ok(h.calls.includes('saved'));
    assert.ok(h.calls.includes('public'));
    assert.ok(h.calls.includes('assignment'));
});

test('failed deletion keeps the editor and photo intact and restores the button', async () => {
    const h = editorHarness({ deleteError: new Error('delete rejected') });
    vm.runInContext(functionSource('deleteLocationEditorPhoto'), h.context);
    await h.context.deleteLocationEditorPhoto();
    assert.equal(h.state.savedPhotos.length, 2);
    assert.equal(h.calls.includes('close'), false);
    assert.equal(h.button.disabled, false);
    assert.match(h.message.textContent, /delete rejected/);
});

test('stale selection and other-account photos cannot be deleted', async () => {
    for (const selected of ['other', 'gone']) {
        const h = editorHarness();
        h.state.selectedLocationPhotoId = selected;
        vm.runInContext(functionSource('deleteLocationEditorPhoto'), h.context);
        await h.context.deleteLocationEditorPhoto();
        assert.equal(h.calls.includes('confirm'), false);
        assert.equal(h.calls.some(c => Array.isArray(c) && c[0] === 'delete'), false);
        assert.equal(h.state.savedPhotos.length, 2);
    }
});

test('map picking uses the saved position then saves clicked coordinates on that photo', async () => {
    const h = editorHarness();
    Object.assign(h.photo, { lat: 37, lng: 127, date: '2026-10-10T00:00:00Z' });
    Object.assign(h.state, { locationEditorPickMode: false, editingPhotoVisibility: 'private', editingPhotoLocationPrecision: 'approximate' });
    const map = { setCenter: position => h.calls.push(['center', position]) };
    Object.assign(h.context, {
        getEditablePhoto: () => h.photo,
        locationEditorHasLocation: () => hasCompleteLocation(h.photo) || h.state.locationEditorHasPickedLocation,
        updateLocationEditorMap: async (lat, lng) => { h.calls.push(['map', lat, lng]); return map; },
        setLocationEditorPickMode: enabled => { h.state.locationEditorPickMode = enabled; },
        ensureLocationEditorMap: async () => map,
        syncLocationEditorPhotoState: () => {},
        enforceVerifiedAccount: () => true, enforceNewAccountLimit: () => true, getPhotosBecomingPublic: () => 0,
        getLocationEditorCoordinateUpdate,
        updatePhotoInfo: async (id, updates) => { h.calls.push(['persist', id, updates]); return { data: { ...h.photo, ...updates }, error: null }; },
        normalizePhotoUpdate: (photo, update) => ({ ...photo, ...update }), updatePhotoDetailModal: () => {}
    });
    vm.runInContext(['startLocationEditorMapPick', 'setLocationEditorCoordinates', 'applyLocationEditorPosition', 'saveManualLocation'].map(functionSource).join('\n'), h.context);
    await h.context.startLocationEditorMapPick();
    assert.equal(h.state.locationEditorPickMode, true);
    assert.deepEqual(h.calls.find(c => Array.isArray(c) && c[0] === 'map'), ['map', 37, 127]);
    await h.context.applyLocationEditorPosition(35.5, 139.5, { center: false });
    await h.context.saveManualLocation({ preventDefault() {} });
    const [, id, updates] = h.calls.find(c => Array.isArray(c) && c[0] === 'persist');
    assert.equal(id, 'mine');
    assert.equal(updates.lat, 35.5);
    assert.equal(updates.lng, 139.5);
    assert.equal(updates.geo_source, 'manual');
    assert.equal(updates.location_assignment_skipped, false);
    assert.equal(updates.location_precision, 'approximate');
    assert.equal(h.state.savedPhotos.find(p => p.id === 'mine').lat, 35.5);
});

test('unavailable map leaves picking off and reports a retry message', async () => {
    const h = editorHarness();
    h.state.locationEditorPickMode = false;
    Object.assign(h.context, {
        getEditablePhoto: () => h.photo, locationEditorHasLocation: () => false,
        updateLocationEditorMap: async () => null,
        setLocationEditorPickMode: enabled => { h.state.locationEditorPickMode = enabled; }
    });
    vm.runInContext(functionSource('startLocationEditorMapPick'), h.context);
    await h.context.startLocationEditorMapPick();
    assert.equal(h.state.locationEditorPickMode, false);
    assert.match(h.message.textContent, /지도를 불러오지 못했습니다/);
});
