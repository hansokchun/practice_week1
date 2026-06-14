import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('myphoto dashboard no longer renders the stats strip', () => {
    const html = readFileSync('index.html', 'utf8');

    assert.equal(html.includes('class="stats-grid"'), false);
    assert.equal(html.includes('id="stat-photo-count"'), false);
    assert.equal(html.includes('id="stat-located-count"'), false);
    assert.equal(html.includes('id="stat-missing-count"'), false);
    assert.equal(html.includes('id="stat-album-count"'), false);
});

test('home absorbs the myphoto dashboard and top-level navigation is reduced to home and explore', () => {
    const html = readFileSync('index.html', 'utf8');
    const source = readFileSync('js/app.js', 'utf8');

    assert.equal(html.includes('id="page-myphoto"'), false);
    assert.equal(html.includes('data-route="myphoto"'), false);
    assert.equal(html.includes('data-mobile-route="myphoto"'), false);
    assert.match(html, /id="page-home"[\s\S]*id="recent-photo-grid"[\s\S]*id="album-list"/);
    assert.match(source, /renderedRoute === APP_SECTIONS\.HOME[\s\S]*renderSavedPhotoSurfaces\(\)/);
});

test('home no longer renders the temporary album preview and public example bands', () => {
    const html = readFileSync('index.html', 'utf8');

    assert.equal(html.includes('id="home-preview-title"'), false);
    assert.equal(html.includes('class="archive-preview"'), false);
    assert.equal(html.includes('id="public-examples-title"'), false);
    assert.equal(html.includes('class="public-example-grid"'), false);
});

test('home leads with public discovery while keeping upload as the secondary action', () => {
    const html = readFileSync('index.html', 'utf8');
    const source = readFileSync('js/app.js', 'utf8');

    assert.match(html, /id="home-title"[\s\S]*다른 사람들의 여행 사진을 지도에서 둘러보세요/);
    assert.match(html, /id="btn-home-explore" class="btn-primary"[\s\S]*둘러보기/);
    assert.match(html, /id="btn-home-myphoto" class="btn-secondary"[\s\S]*내 사진으로 지도 만들기/);
    assert.match(html, /id="home-public-preview-title"[\s\S]*지금 지도에서 볼 수 있는 공개 사진/);
    assert.match(html, /class="home-public-photo-grid"[\s\S]*data-route="explore"/);
    assert.match(source, /\$\('#btn-home-explore'\)\?\.addEventListener\('click', \(\) => routeTo\(APP_SECTIONS\.EXPLORE\)\)/);
    assert.match(source, /\$\('#btn-home-myphoto'\)\?\.addEventListener\('click', \(\) => routeTo\('upload'\)\)/);
});

test('home includes a concise site explanation section with map photo artwork', () => {
    const html = readFileSync('index.html', 'utf8');
    const css = readFileSync('style.css', 'utf8');

    assert.match(html, /class="content-band home-story-band"[\s\S]*id="home-story-title"/);
    assert.match(html, /images\/home-map-memory-board\.png/);
    assert.match(html, /사진은 지도 위에서 더 쉽게 이어집니다/);
    assert.match(html, /Explore[\s\S]*내 사진[\s\S]*앨범/);
    assert.match(css, /\.home-story-band\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.05fr\)\s*minmax\(360px,\s*0\.95fr\);/s);
});

test('home private workspace is only visible after login', () => {
    const html = readFileSync('index.html', 'utf8');
    const css = readFileSync('style.css', 'utf8');
    const source = readFileSync('js/app.js', 'utf8');

    assert.match(html, /<body[^>]*class="is-logged-out"/);
    assert.match(css, /body\.is-logged-out\s+\.home-workspace\s*\{[^}]*display:\s*none;/s);
    assert.match(css, /body\.is-logged-in\s+\.home-workspace\s*\{[^}]*display:\s*block;/s);
    assert.match(source, /document\.body\.classList\.toggle\('is-logged-in', Boolean\(state\.currentUser\)\)/);
    assert.match(source, /document\.body\.classList\.toggle\('is-logged-out', !state\.currentUser\)/);
});

test('logged-in home prioritizes the private workspace and compresses intro content', () => {
    const css = readFileSync('style.css', 'utf8');

    assert.match(css, /body\.is-logged-in\s+\.page-home\.active\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/s);
    assert.match(css, /body\.is-logged-in\s+\.home-workspace\s*\{[^}]*order:\s*1;/s);
    assert.match(css, /body\.is-logged-in\s+\.hero\s*\{[^}]*order:\s*2;[^}]*min-height:\s*auto;/s);
    assert.match(css, /body\.is-logged-in\s+\.hero-visual\s*\{[^}]*display:\s*none;/s);
    assert.match(css, /body\.is-logged-in\s+\.white-band\s*\{[^}]*display:\s*none;/s);
});

test('photo detail modal keeps the right information panel inside the viewport', () => {
    const css = readFileSync('style.css', 'utf8');

    assert.match(css, /\.photo-detail-card section\s*\{[^}]*min-width:\s*0;/s);
    assert.match(css, /\.photo-detail-card\s*\{[^}]*width:\s*min\(1180px,\s*calc\(100vw - 32px\)\);/s);
    assert.match(css, /\.photo-detail-card\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(260px,\s*320px\);/s);
    assert.match(css, /\.photo-detail-card\s*\{[^}]*align-items:\s*start;/s);
    assert.match(css, /\.photo-detail-card section\s*\{[^}]*align-self:\s*start;/s);
    assert.match(css, /\.photo-detail-card > img\s*\{[^}]*height:\s*auto;/s);
    assert.match(css, /\.photo-detail-card > img\s*\{[^}]*max-height:\s*calc\(100vh - 48px\);/s);
    assert.doesNotMatch(css, /\.photo-detail-card > img\s*\{[^}]*min-height:/s);
});

test('empty recent photo notice uses the same empty card style as the album notice', () => {
    const source = readFileSync('js/app.js', 'utf8');
    const css = readFileSync('style.css', 'utf8');

    const recentStart = source.indexOf('<article class="empty-state album-empty-state recent-photo-empty">');
    const albumStart = source.indexOf('<article class="empty-state album-empty-state">');

    assert.notEqual(recentStart, -1);
    assert.notEqual(albumStart, -1);
    assert.match(source.slice(recentStart, recentStart + 360), /data-route="upload"/);
    assert.match(css, /\.recent-photo-grid article\.recent-photo-empty\s*\{[^}]*aspect-ratio:\s*auto;[^}]*min-height:\s*112px;/s);
    assert.doesNotMatch(css, /\.recent-photo-empty button\s*\{/);
});
