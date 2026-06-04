import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const source = readFileSync('js/app.js', 'utf8');

test('Explore exposes mutually exclusive photo owner scope controls', () => {
    assert.match(html, /data-explore-scope="others"/);
    assert.match(html, /data-explore-scope="mine"/);
    assert.match(source, /explorePhotoScope:\s*'mine'/);
    assert.match(source, /function setExplorePhotoScope\(scope\)/);
    assert.match(source, /event\.target\.closest\('\[data-explore-scope\]'\)/);
});

test('Explore map markers are driven by public photos in the selected owner scope', () => {
    assert.match(source, /function getPublicPhotoMapItems\(\)/);
    assert.match(source, /photo\.shared \|\| \['public', 'link'\]\.includes\(photo\.visibility\)/);
    assert.match(source, /state\.explorePhotoScope === 'mine' \? isMine : !isMine/);
    assert.match(source, /const locatedPhotos = getPublicPhotoMapItems\(\);/);
    assert.match(source, /if \(!locatedPhotos\.length\) \{/);
});

test('Explore photo map items do not depend on album visibility', () => {
    const fnStart = source.indexOf('function getPublicPhotoMapItems()');
    const fnEnd = source.indexOf('function renderExplorePhotoScopeControls()', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /photo\.visibility/);
    assert.doesNotMatch(body, /album\.visibility/);
    assert.doesNotMatch(body, /\['public', 'link'\]\.includes\(album\.visibility\)/);
});
