import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    getSelectedPersonalPhotos,
    prunePersonalPhotoSelection,
    removeSelectedPersonalPhotos,
    togglePersonalPhotoSelection
} from '../js/personal-photo-selection.mjs';

const photos = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' }
];

test('togglePersonalPhotoSelection adds and removes one photo id', () => {
    assert.deepEqual(togglePersonalPhotoSelection(['a'], 'b'), ['a', 'b']);
    assert.deepEqual(togglePersonalPhotoSelection(['a', 'b'], 'a'), ['b']);
    assert.deepEqual(togglePersonalPhotoSelection(['a', 'b']), []);
});

test('recent photo selection controls use Google Photos style hover and selected states', () => {
    const markup = readFileSync('index.html', 'utf8');
    const source = readFileSync('js/app.js', 'utf8');
    const styles = readFileSync('style.css', 'utf8');

    assert.match(markup, /id="btn-delete-selected-photos"[^>]*disabled hidden/);
    assert.match(markup, /id="btn-publish-selected-photos"[^>]*disabled hidden/);
    assert.match(markup, /id="btn-private-selected-photos"[^>]*disabled hidden/);
    assert.match(markup, /id="btn-clear-selected-photos"[^>]*data-toggle-personal-photo[^>]*hidden/);
    assert.match(source, /clearButton\.hidden = publishButton\.hidden = privateButton\.hidden = deleteButton\.hidden = !selectedCount;/);
    assert.match(source, /publishButton\.disabled = !hasNonPublicPhoto;/);
    assert.match(source, /privateButton\.disabled = !hasNonPrivatePhoto;/);
    assert.match(source, /lastToggledPersonalPhotoId:\s*null/);
    assert.match(source, /class="personal-photo-card \$\{isSelected \? 'is-selected' : ''\} \$\{isSelected && state\.lastToggledPersonalPhotoId === photo\.id \? 'is-selection-animated' : ''\}"/);
    assert.match(source, /state\.lastToggledPersonalPhotoId = null;/);
    assert.match(source, /state\.lastToggledPersonalPhotoId = personalPhotoToggle\.dataset\.togglePersonalPhoto \|\| null;/);
    assert.match(source, /data-toggle-personal-photo="\$\{escapeHtml\(photo\.id\)\}"/);
    assert.match(source, /selectedCount \? `data-toggle-personal-photo="\$\{escapeHtml\(photo\.id\)\}"` : ''/);
    assert.match(styles, /\.personal-photo-card::before\s*\{[^}]*height:\s*46%;[^}]*linear-gradient\(180deg,\s*rgba\(0,\s*0,\s*0,\s*0\.42\)/s);
    assert.match(styles, /\.personal-photo-card:hover::before,[\s\S]*\.personal-photo-card\.is-selected::before\s*\{[^}]*opacity:\s*1;/s);
    assert.match(styles, /\.photo-select-button\s*\{[^}]*left:\s*12px;[^}]*width:\s*28px;[^}]*height:\s*28px;[^}]*opacity:\s*0;[^}]*transform:\s*scale\(0\.78\);/s);
    assert.match(styles, /\.photo-select-button\s*\{[^}]*cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/s);
    assert.match(styles, /\.photo-select-button::after\s*\{[^}]*opacity:\s*0;[^}]*transform:\s*scale\(0\.72\);/s);
    assert.match(styles, /\.personal-photo-card:hover\s+\.photo-select-button,[\s\S]*\.personal-photo-card\.is-selected\s+\.photo-select-button\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*scale\(1\);/s);
    assert.match(styles, /\.photo-select-button\[aria-pressed="true"\]\s*\{[^}]*width:\s*76px;/s);
    assert.match(styles, /\.photo-select-button::before\s*\{[^}]*content:\s*"선택됨";[^}]*opacity:\s*0;/s);
    assert.match(styles, /\.photo-select-button\[aria-pressed="true"\]::before\s*\{[^}]*opacity:\s*1;/s);
    assert.match(styles, /\.selection-clear-button\[hidden\]\s*\{[^}]*display:\s*none;/s);
    assert.match(styles, /\.personal-photo-card\.is-selected\s*\{[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;[^}]*transform:\s*scale\(0\.96\);/s);
    assert.doesNotMatch(styles, /\.personal-photo-card\.is-selected\s+img\s*\{[^}]*transform:/s);
    assert.match(styles, /\.personal-photo-card\.is-selection-animated\s*\{[^}]*animation:\s*selectedPhotoSettle 220ms cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\);/s);
    assert.match(styles, /@keyframes selectedPhotoSettle\s*\{[\s\S]*58%\s*\{[\s\S]*transform:\s*scale\(0\.94\);[\s\S]*100%\s*\{[\s\S]*transform:\s*scale\(0\.96\);/s);
});

test('selected personal photos can be published or made private in one guarded action', () => {
    const markup = readFileSync('index.html', 'utf8');
    const source = readFileSync('js/app.js', 'utf8');
    const functionStart = source.indexOf('async function updateSelectedPersonalPhotosVisibility(');
    const functionEnd = source.indexOf('async function deleteSelectedPersonalPhotos()', functionStart);
    const body = source.slice(functionStart, functionEnd);

    assert.match(markup, /id="btn-publish-selected-photos"[\s\S]*public[\s\S]*공개로 전환/);
    assert.match(markup, /id="btn-private-selected-photos"[\s\S]*lock[\s\S]*비공개로 전환/);
    assert.match(body, /enforceVerifiedAccount\('publish'\)/);
    assert.match(body, /incomingPublicCount:\s*getPhotosBecomingPublic\(selectedPhotoIds\)/);
    assert.match(body, /window\.confirm\([\s\S]*대략 위치/);
    assert.match(body, /const publicLocationPrecision = nextVisibility === 'public' \? 'approximate' : undefined;/);
    assert.match(body, /updatePhotosVisibility\(selectedPhotoIds, nextVisibility, publicLocationPrecision\)/);
    assert.match(body, /state\.selectedPersonalPhotoIds = \[\];/);
    assert.match(body, /renderSavedPhotoSurfaces\(\);[\s\S]*renderPublicSurfaces\(\);/);
    assert.match(source, /btn-publish-selected-photos[^\n]+updateSelectedPersonalPhotosVisibility\('public'\)/);
    assert.match(source, /btn-private-selected-photos[^\n]+updateSelectedPersonalPhotosVisibility\('private'\)/);
});

test('getSelectedPersonalPhotos returns selected photos in page order', () => {
    assert.deepEqual(getSelectedPersonalPhotos(photos, ['c', 'a']), [photos[0], photos[2]]);
});

test('removeSelectedPersonalPhotos removes selected photos only', () => {
    assert.deepEqual(removeSelectedPersonalPhotos(photos, ['a', 'c']), [photos[1]]);
});

test('prunePersonalPhotoSelection removes ids no longer present', () => {
    assert.deepEqual(prunePersonalPhotoSelection(['a', 'missing', 'c'], photos), ['a', 'c']);
});
