import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const source = readFileSync('js/app.js', 'utf8');

test('Explore exposes the photo owner scope as an icon-only toggle with an accessible tooltip', () => {
    assert.doesNotMatch(html, /id=\"explore-photo-scope-title\"/);
    assert.doesNotMatch(html, /사진 출처 선택/);
    assert.doesNotMatch(html, /지도에 표시할 사진의 출처를 선택하세요\./);
    assert.doesNotMatch(html, /explore-photo-scope-control/);
    assert.match(html, /class=\"explore-photo-scope\" aria-label=\"지도에 표시할 사진 출처\"/);
    assert.match(html, /class=\"explore-photo-scope-trigger\"[^>]*data-explore-scope-trigger[^>]*aria-label=\"다른 사람 사진\"[^>]*aria-pressed=\"false\"[^>]*aria-describedby=\"explore-photo-scope-tooltip\"/);
    assert.match(html, /data-explore-scope-trigger-icon[^>]*aria-hidden=\"true\">groups<\/span>/);
    assert.doesNotMatch(html, /data-explore-scope-trigger-label|explore-photo-scope-chevron|explore-photo-scope-menu|data-explore-scope=\"/);
    assert.match(html, /id=\"explore-photo-scope-tooltip\" class=\"explore-photo-scope-tooltip\" role=\"tooltip\" data-explore-scope-tooltip>다른 사람 사진<\/span>/);
    const panelStart = html.indexOf('id=\"explore-list\"');
    const scopeStart = html.indexOf('class=\"explore-photo-scope\"', panelStart);
    const bodyStart = html.indexOf('id=\"explore-discovery-body\"', panelStart);

    assert.ok(panelStart > -1);
    assert.ok(scopeStart > panelStart);
    assert.ok(scopeStart < bodyStart);
    assert.match(source, /explorePhotoScope:\s*'others'/);
    assert.doesNotMatch(source, /explorePhotoScope = 'mine';\s*state\.exploreInitializedUserId/);
    assert.match(source, /function setExplorePhotoScope\(scope\)/);
    assert.doesNotMatch(source, /isExplorePhotoScopeMenuOpen|setExplorePhotoScopeMenuOpen/);
    assert.match(source, /trigger\.setAttribute\('aria-pressed', String\(scopeMeta\.pressed\)\)/);
    assert.match(source, /trigger\.setAttribute\('aria-label', scopeMeta\.label\)/);
    assert.match(source, /tooltip\.textContent = scopeMeta\.label/);
    assert.match(source, /event\.target\.closest\('\[data-explore-scope-trigger\]'\)/);
    assert.match(source, /setExplorePhotoScope\(getNextExplorePhotoScope\(state\.explorePhotoScope\)\)/);
});

test('guest owner-scope toggle explains login and never switches to private photos', () => {
    const setter = source.slice(source.indexOf('function setExplorePhotoScope(scope)'), source.indexOf('function resetExploreSelectionState()'));
    assert.match(setter, /scope === 'mine' && !state\.currentUser/);
    assert.match(setter, /내 사진은 로그인 후 볼 수 있어요/);
    assert.ok(setter.indexOf("scope === 'mine'") < setter.indexOf('state.explorePhotoScope = scope'));
    assert.match(setter, /shouldPreserveExploreViewport/);
    assert.match(setter, /keepMobileDiscoveryOpen/);
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
