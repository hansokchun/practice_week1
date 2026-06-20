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

    assert.match(html, /class="home-choice-band"[\s\S]*id="home-choice-title"/);
    assert.match(html, /다른 사람 사진 둘러보기/);
    assert.match(html, /내 사진으로 지도 만들기/);
    assert.match(css, /\.home-choice-band\s*\{[^}]*grid-template-columns:\s*minmax\(260px,\s*0\.72fr\)\s*minmax\(0,\s*1\.28fr\);/s);
    assert.match(html, /class="home-fit-band"[\s\S]*id="home-fit-title"/);
    assert.match(html, /사진첩보다 장소가 먼저 떠오르는 여행이라면/);
    assert.match(html, /여행 사진이 너무 많을 때[\s\S]*다음 여행 장소를 찾고 싶을 때[\s\S]*공개는 조심스럽게 하고 싶을 때/);
    assert.match(css, /\.home-fit-band\s*\{[^}]*grid-template-columns:\s*minmax\(300px,\s*0\.82fr\)\s*minmax\(0,\s*1\.18fr\);/s);
    assert.match(html, /class="content-band home-explore-guide"[\s\S]*id="home-explore-guide-title"/);
    assert.match(html, /images\/home-explore-guide\.png/);
    assert.match(html, /지도를 움직이며 사진이 남겨진 장소를 찾아보세요/);
    assert.match(css, /\.home-explore-guide\s*\{[^}]*grid-template-columns:\s*minmax\(320px,\s*0\.78fr\)\s*minmax\(0,\s*1\.22fr\);/s);
    assert.match(html, /class="content-band home-album-guide"[\s\S]*id="home-album-guide-title"/);
    assert.match(html, /사진을 날짜별로 모아 하나의 여행 앨범으로 정리하세요/);
    assert.match(html, /날짜별 정리[\s\S]*지도 핀 확인[\s\S]*비공개 우선/);
    assert.match(css, /\.home-album-guide\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.05fr\)\s*minmax\(360px,\s*0\.95fr\);/s);
    assert.match(html, /class="content-band home-east-asia-demo"[\s\S]*id="home-east-asia-demo-title"/);
    assert.match(html, /동아시아 지도 위에서 공개 사진 핀을 먼저 살펴보세요/);
    assert.match(html, /data-home-sample-pin="seoul"[\s\S]*data-home-sample-pin="tokyo"[\s\S]*data-home-sample-pin="jeju"/);
    assert.match(css, /\.home-east-asia-map\s*\{[^}]*min-height:\s*520px;/s);
    assert.match(html, /class="home-replay-hero"[\s\S]*id="home-replay-title"/);
    assert.match(html, /images\/home-travel-replay\.png/);
    assert.match(html, /사진이 흩어져 있어도 여행의 흐름은 남아 있습니다/);
    assert.match(css, /\.home-replay-hero\s*\{[^}]*min-height:\s*520px;/s);
    assert.match(html, /class="content-band home-story-band"[\s\S]*id="home-story-title"/);
    assert.match(html, /images\/home-map-memory-board\.png/);
    assert.match(html, /사진은 지도 위에서 더 쉽게 이어집니다/);
    assert.match(html, /Explore[\s\S]*내 사진[\s\S]*앨범/);
    assert.match(css, /\.home-story-band\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.05fr\)\s*minmax\(360px,\s*0\.95fr\);/s);
});

test('home service introduction sections start with Explore, album, and East Asia map preview', () => {
    const html = readFileSync('index.html', 'utf8');
    const choiceIndex = html.indexOf('class="home-choice-band"');
    const exploreIndex = html.indexOf('class="content-band home-explore-guide"');
    const albumIndex = html.indexOf('class="content-band home-album-guide"');
    const eastAsiaIndex = html.indexOf('class="content-band home-east-asia-demo"');
    const publicPreviewIndex = html.indexOf('class="content-band home-public-preview"');

    assert.ok(choiceIndex > -1);
    assert.ok(exploreIndex > choiceIndex);
    assert.ok(albumIndex > exploreIndex);
    assert.ok(eastAsiaIndex > albumIndex);
    assert.ok(publicPreviewIndex > eastAsiaIndex);
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

test('logged-in home hides the public intro sections and shows only the private workspace', () => {
    const css = readFileSync('style.css', 'utf8');

    assert.match(css, /body\.is-logged-in\s+\.home-workspace\s*\{[^}]*display:\s*block;/s);
    assert.match(css, /body\.is-logged-in\s+\.hero,\s*body\.is-logged-in\s+\.home-choice-band,\s*body\.is-logged-in\s+\.home-public-preview,\s*body\.is-logged-in\s+\.home-fit-band,\s*body\.is-logged-in\s+\.home-replay-hero,\s*body\.is-logged-in\s+\.home-explore-guide,\s*body\.is-logged-in\s+\.home-album-guide,\s*body\.is-logged-in\s+\.home-east-asia-demo,\s*body\.is-logged-in\s+\.home-story-band,\s*body\.is-logged-in\s+\.white-band\s*\{[^}]*display:\s*none;/s);
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
