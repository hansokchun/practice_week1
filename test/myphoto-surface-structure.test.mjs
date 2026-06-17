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

test('home no longer exposes previous temporary preview route blocks', () => {
    const html = readFileSync('index.html', 'utf8');

    assert.equal(html.includes('id="home-preview-title"'), false);
    assert.equal(html.includes('class="archive-preview"'), false);
    assert.equal(html.includes('id="public-examples-title"'), false);
    assert.equal(html.includes('class="public-example-grid"'), false);
});

test('home leads with public discovery while keeping upload as the secondary action', () => {
    const html = readFileSync('index.html', 'utf8');
    const source = readFileSync('js/app.js', 'utf8');

    assert.match(html, /id="home-minimal-title"[\s\S]*여행 사진을 올리면, 기억이 지도 위에서 다시 선명해집니다/);
    assert.match(html, /id="btn-home-explore" class="btn-primary"[\s\S]*Explore 둘러보기/);
    assert.match(html, /id="btn-home-myphoto" class="btn-secondary"[\s\S]*내 사진으로 시작하기/);
    assert.match(html, /id="home-minimal-preview-title"[\s\S]*처음 방문했다면 지도에서 공개 사진부터 살펴보세요/);
    assert.match(html, /class="home-minimal-card"[\s\S]*data-route="explore"/);
    assert.match(source, /\$\('#btn-home-explore'\)\?\.addEventListener\('click', \(\) => routeTo\(APP_SECTIONS\.EXPLORE\)\)/);
    assert.match(source, /\$\('#btn-home-myphoto'\)\?\.addEventListener\('click', \(\) => routeTo\('upload'\)\)/);
});

test('home includes a concise Stitch-inspired explanation surface with map photo artwork', () => {
    const html = readFileSync('index.html', 'utf8');
    const css = readFileSync('style.css', 'utf8');

    assert.match(html, /class="home-minimal-cards"[\s\S]*공개 사진을 지도에서 발견[\s\S]*내 사진을 조용히 보관[\s\S]*여행 앨범을 지도처럼 보기/);
    assert.match(css, /\.home-minimal-cards\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/s);
    assert.match(html, /class="home-minimal-preview"[\s\S]*id="home-minimal-preview-title"/);
    assert.match(html, /images\/home-explore-guide\.png/);
    assert.match(css, /\.home-minimal-preview\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*0\.82fr\)\s*minmax\(0,\s*1\.18fr\);/s);
    assert.match(html, /class="home-minimal-gallery"[\s\S]*id="home-gallery-title"/);
    assert.match(html, /images\/home-travel-replay\.png/);
    assert.match(html, /images\/home-map-memory-board\.png/);
    assert.match(html, /class="home-minimal-process"[\s\S]*사진에서 지도까지, 세 단계로 충분합니다/);
    assert.match(css, /\.home-process-steps\s*\{[^}]*display:\s*flex;/s);
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

test('logged-in home hides the public intro and shows only the private workspace', () => {
    const css = readFileSync('style.css', 'utf8');

    assert.match(css, /body\.is-logged-in\s+\.home-workspace\s*\{[^}]*display:\s*block;/s);
    assert.match(css, /body\.is-logged-in\s+\.home-minimal-shell\s*\{[^}]*display:\s*none;/s);
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
