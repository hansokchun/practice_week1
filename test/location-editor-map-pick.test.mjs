import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('photo info editor enables map picking only from the map edit button', () => {
    assert.match(app, /locationEditorPickMode:\s*false/);
    assert.match(app, /async function startLocationEditorMapPick\(\)/);
    assert.match(app, /#btn-pick-photo-location'\)\?\.addEventListener\('click', startLocationEditorMapPick\)/);
    assert.match(app, /const nextPickMode = !state\.locationEditorPickMode;/);
    assert.match(app, /state\.locationEditorPickMode[\s\S]*\? '위치 지정 완료'[\s\S]*locationEditorHasLocation\(\) \? '지도에서 위치수정' : '지도에서 위치 지정'/);
    assert.match(app, /state\.locationEditorMap\.addListener\('click'/);
    assert.match(app, /if \(!state\.locationEditorPickMode \|\| !event\.latLng\) return;/);
    assert.match(app, /state\.locationEditorMarker\?\.setDraggable\(state\.locationEditorPickMode\)/);
    assert.match(app, /modal\?\.classList\.toggle\('is-map-picking'/);
});

test('photo info editor map writes picked coordinates into read-only fields', () => {
    assert.match(app, /function setLocationEditorCoordinateFields\(lat, lng\)/);
    assert.match(app, /latInput\.value = Number\.isFinite\(lat\) \? lat\.toFixed\(6\) : '';/);
    assert.match(app, /lngInput\.value = Number\.isFinite\(lng\) \? lng\.toFixed\(6\) : '';/);
});

test('missing-location photos open over Korea without turning the Gyeongbokgung default into a pin', () => {
    assert.match(app, /updateLocationEditorMap\(Number\(draft\.lat\), Number\(draft\.lng\), \{[\s\S]*zoom: hasSavedLocation \? 13 : 7,[\s\S]*showMarker: hasSavedLocation[\s\S]*\}\)/);
    assert.match(app, /async function saveManualLocation\(event\)[\s\S]*updatePhotoInfo\(photo\.id/);
});
