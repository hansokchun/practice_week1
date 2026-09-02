import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const source = readFileSync('js/app.js', 'utf8');

test('Explore exposes the photo owner scope as a compact dropdown control', () => {
    assert.doesNotMatch(html, /id=\"explore-photo-scope-title\"/);
    assert.doesNotMatch(html, /사진 출처 선택/);
    assert.doesNotMatch(html, /지도에 표시할 사진의 출처를 선택하세요\./);
    assert.doesNotMatch(html, /explore-photo-scope-control/);
    assert.match(html, /class=\"explore-photo-scope\" aria-label=\"지도에 표시할 사진 출처\"/);
    assert.match(html, /class=\"explore-photo-scope-trigger\"[^>]*data-explore-scope-trigger[^>]*aria-haspopup=\"menu\"[^>]*aria-expanded=\"false\"/);
    assert.match(html, /data-explore-scope-trigger-icon[^>]*aria-hidden=\"true\">groups<\/span>/);
    assert.match(html, /data-explore-scope-trigger-label>다른 사람 사진<\/span>/);
    assert.match(html, /class=\"material-symbols-outlined explore-photo-scope-chevron\"[^>]*>keyboard_arrow_down<\/span>/);
    assert.match(html, /id=\"explore-photo-scope-menu\" class=\"explore-photo-scope-menu\" role=\"menu\" hidden/);
    assert.match(html, /data-explore-scope=\"others\"/);
    assert.match(html, /data-explore-scope=\"mine\"/);
    assert.match(html, /data-explore-scope=\"mine\"[^>]*aria-checked=\"false\"[\s\S]*<span class=\"material-symbols-outlined\" aria-hidden=\"true\">person<\/span>[\s\S]*내 사진[\s\S]*explore-photo-scope-check/);
    assert.match(html, /data-explore-scope=\"others\"[^>]*class=\"active\"[^>]*aria-checked=\"true\"[\s\S]*<span class=\"material-symbols-outlined\" aria-hidden=\"true\">groups<\/span>[\s\S]*다른 사람 사진[\s\S]*explore-photo-scope-check/);
    const panelStart = html.indexOf('id=\"explore-list\"');
    const scopeStart = html.indexOf('class=\"explore-photo-scope\"', panelStart);
    const bodyStart = html.indexOf('id=\"explore-discovery-body\"', panelStart);

    assert.ok(panelStart > -1);
    assert.ok(scopeStart > panelStart);
    assert.ok(scopeStart < bodyStart);
    assert.match(source, /explorePhotoScope:\s*'others'/);
    assert.doesNotMatch(source, /explorePhotoScope = 'mine';\s*state\.exploreInitializedUserId/);
    assert.match(source, /isExplorePhotoScopeMenuOpen:\s*false/);
    assert.match(source, /function setExplorePhotoScope\(scope\)/);
    assert.match(source, /function setExplorePhotoScopeMenuOpen\(isOpen\)/);
    assert.match(source, /button\.setAttribute\('aria-checked', isActive \? 'true' : 'false'\)/);
    assert.match(source, /event\.target\.closest\('\[data-explore-scope-trigger\]'\)/);
    assert.match(source, /event\.target\.closest\('\[data-explore-scope\]'\)/);
});

test('Explore map markers use an owner-aware scope without changing public surfaces', () => {
    assert.match(source, /function getPublicPhotoMapItems\(\)/);
    assert.match(source, /function getExplorePhotoMapItems\(\)/);
    assert.match(source, /canShowPhotoInExploreScope\(photo,/);
    assert.match(source, /const explorePhotos = getExplorePhotoMapItems\(\);/);
    assert.match(source, /const locatedPhotos = explorePhotos;/);
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
