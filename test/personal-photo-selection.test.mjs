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
});

test('recent photo selection controls use Google Photos style hover and selected states', () => {
    const source = readFileSync('js/app.js', 'utf8');
    const styles = readFileSync('style.css', 'utf8');

    assert.match(source, /class="personal-photo-card \$\{isSelected \? 'is-selected' : ''\}"/);
    assert.match(source, /data-toggle-personal-photo="\$\{escapeHtml\(photo\.id\)\}"/);
    assert.match(styles, /\.personal-photo-card::before\s*\{[^}]*background:\s*rgba\(0,\s*0,\s*0,\s*0\.22\);[^}]*opacity:\s*0;/s);
    assert.match(styles, /\.personal-photo-card:hover::before,[\s\S]*\.personal-photo-card\.is-selected::before\s*\{[^}]*opacity:\s*1;/s);
    assert.match(styles, /\.photo-select-button\s*\{[^}]*opacity:\s*0;[^}]*transform:\s*scale\(0\.82\);/s);
    assert.match(styles, /\.personal-photo-card:hover\s+\.photo-select-button,[\s\S]*\.personal-photo-card\.is-selected\s+\.photo-select-button\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*scale\(1\);/s);
    assert.match(styles, /\.personal-photo-card\.is-selected\s+img\s*\{[^}]*transform:\s*scale\(0\.94\);/s);
    assert.match(styles, /\.personal-photo-card\.is-selected\s*\{[^}]*background:\s*rgba\(26,\s*77,\s*78,\s*0\.12\);/s);
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
