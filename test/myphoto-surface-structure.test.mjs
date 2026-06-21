import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = () => readFileSync('index.html', 'utf8');
const css = () => readFileSync('style.css', 'utf8');
const source = () => readFileSync('js/app.js', 'utf8');

test('myphoto dashboard no longer renders the stats strip', () => {
    const markup = html();

    assert.equal(markup.includes('class="stats-grid"'), false);
    assert.equal(markup.includes('id="stat-photo-count"'), false);
    assert.equal(markup.includes('id="stat-located-count"'), false);
    assert.equal(markup.includes('id="stat-missing-count"'), false);
    assert.equal(markup.includes('id="stat-album-count"'), false);
});

test('home absorbs the myphoto dashboard and top-level navigation is reduced to home and explore', () => {
    const markup = html();
    const app = source();

    assert.equal(markup.includes('id="page-myphoto"'), false);
    assert.equal(markup.includes('data-route="myphoto"'), false);
    assert.equal(markup.includes('data-mobile-route="myphoto"'), false);
    assert.match(markup, /id="page-home"[\s\S]*id="recent-photo-grid"[\s\S]*id="album-list"/);
    assert.match(app, /renderedRoute === APP_SECTIONS\.HOME[\s\S]*renderSavedPhotoSurfaces\(\)/);
});

test('home no longer renders temporary preview bands or removed intro candidates', () => {
    const markup = html();

    for (const removed of [
        'id="home-preview-title"',
        'class="archive-preview"',
        'id="public-examples-title"',
        'class="public-example-grid"',
        'hero-memory-line',
        'home-choice-band',
        'Choose Your Start',
        'home-east-asia-demo',
        'Explore Preview',
        'data-home-sample-pin',
        'home-fit-band',
        'When It Fits',
        'home-replay-hero',
        'Replay Your Journey',
        'images/home-travel-replay.png',
        'home-story-band',
        'home-flow-title',
        'process-grid',
    ]) {
        assert.equal(markup.includes(removed), false, `${removed} should be removed`);
    }
});

test('home hero keeps the map and rotating country photo preview without extra copy', () => {
    const markup = html();
    const app = source();
    const styles = css();

    const heroStart = markup.indexOf('<div class="hero">');
    const heroEnd = markup.indexOf('<section class="content-band home-explore-guide"', heroStart);
    const hero = markup.slice(heroStart, heroEnd);

    assert.notEqual(heroStart, -1);
    assert.notEqual(heroEnd, -1);
    assert.match(hero, /images\/home-world-map\.png/);
    assert.match(hero, /class="hero-world-map"[\s\S]*data-hero-map-pin="korea"[\s\S]*data-hero-map-pin="japan"[\s\S]*data-hero-map-pin="turkey"/);
    assert.match(hero, /class="hero-photo-slider"[\s\S]*Korea[\s\S]*Japan[\s\S]*Turkey/);
    assert.doesNotMatch(hero, /btn-home-explore|btn-home-myphoto|hero-memory-line/);
    assert.match(styles, /\.hero\s*\{[^}]*grid-template-columns:\s*1fr;[^}]*min-height:\s*640px;[^}]*overflow:\s*hidden;/s);
    assert.match(styles, /\.hero-world-panel\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;/s);
    assert.match(styles, /\.hero-world-map\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;/s);
    assert.match(styles, /\.hero-visual\s*\{[^}]*z-index:\s*4;[^}]*width:\s*min\(46%,\s*520px\);[^}]*margin-left:\s*clamp\(24px,\s*6vw,\s*72px\);/s);
    assert.match(app, /function startHomeHeroSlider\(\)/);
    assert.match(app, /const mapPins = \$\$\('\[data-hero-map-pin\]'\)/);
    assert.match(app, /pin\.classList\.toggle\('is-active', pin\.dataset\.heroMapPin === place\)/);
    assert.match(app, /window\.setInterval\(\(\) => \{[\s\S]*\}, 3000\)/);
});

test('home keeps only the remaining public explanation sections before the private workspace', () => {
    const markup = html();
    const styles = css();

    const easolIndex = markup.indexOf('class="home-easol-intro"');
    const heroIndex = markup.indexOf('<div class="hero">');
    const exploreIndex = markup.indexOf('class="content-band home-explore-guide"');
    const albumIndex = markup.indexOf('class="content-band home-album-guide"');
    const publicPreviewIndex = markup.indexOf('class="content-band home-public-preview"');
    const routeReferenceIndex = markup.indexOf('data-reference-style="polarsteps"');
    const logReferenceIndex = markup.indexOf('data-reference-style="findpenguins"');
    const albumReferenceIndex = markup.indexOf('data-reference-style="journi"');
    const experienceIndex = markup.indexOf('class="home-experience-commerce"');
    const workspaceIndex = markup.indexOf('class="home-workspace page-container"');

    assert.ok(easolIndex > -1);
    assert.ok(heroIndex > easolIndex);
    assert.ok(exploreIndex > -1);
    assert.ok(exploreIndex > heroIndex);
    assert.ok(albumIndex > exploreIndex);
    assert.ok(publicPreviewIndex > albumIndex);
    assert.ok(routeReferenceIndex > publicPreviewIndex);
    assert.ok(logReferenceIndex > routeReferenceIndex);
    assert.ok(albumReferenceIndex > logReferenceIndex);
    assert.ok(experienceIndex > albumReferenceIndex);
    assert.ok(workspaceIndex > experienceIndex);
    assert.match(markup, /images\/home-explore-guide\.png/);
    assert.match(markup, /images\/home-map-memory-board\.png/);
    assert.match(markup, /class="home-public-photo-grid"[\s\S]*data-route="explore"/);
    assert.match(markup, /여행이 지나간 길을 하나의 흐름으로 다시 봅니다/);
    assert.match(markup, /사진 하나가 장소의 기록이 되고, 공개하면 누군가의 다음 여행이 됩니다/);
    assert.match(markup, /사진을 고르면 날짜별 앨범과 지도 기록으로 정리됩니다/);
    assert.match(styles, /\.home-explore-guide\s*\{[^}]*grid-template-columns:\s*minmax\(320px,\s*0\.78fr\)\s*minmax\(0,\s*1\.22fr\);/s);
    assert.match(styles, /\.home-album-guide\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.05fr\)\s*minmax\(360px,\s*0\.95fr\);/s);
    assert.match(styles, /\.home-reference-section\s*\{[^}]*grid-template-columns:\s*minmax\(320px,\s*0\.86fr\)\s*minmax\(0,\s*1\.14fr\);/s);
});

test('home adds an Easol-inspired dark landing section for Travelgram', () => {
    const markup = html();
    const styles = css();

    assert.match(markup, /class="home-experience-commerce"[\s\S]*Travelgram OS/);
    assert.match(markup, /여행 사진을 올리고, 지도에 남기고, 공개할 순간만 고르세요/);
    assert.match(markup, /class="experience-product-strip"[\s\S]*지도 위 공개 사진[\s\S]*날짜별 앨범 정리[\s\S]*비공개 우선 보관/);
    assert.match(markup, /class="experience-proof-grid"[\s\S]*The problem[\s\S]*The solution[\s\S]*Result/);
    assert.match(styles, /\.home-experience-commerce\s*\{[^}]*background:\s*#070807;[^}]*color:\s*#f7f4ec;/s);
    assert.match(styles, /\.experience-hero h2\s*\{[^}]*font-family:\s*Georgia,[^}]*font-size:\s*clamp\(52px,\s*8vw,\s*118px\);/s);
    assert.match(styles, /\.experience-product-strip\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/s);
});

test('home adds a lapa-style intro section with oversized headline, category rail, and staggered image blocks', () => {
    const markup = html();
    const styles = css();

    assert.match(markup, /class="home-easol-intro"[\s\S]*class="easol-intro-top"/);
    assert.match(markup, /class="easol-intro-brand"[\s\S]*Travelgram/);
    assert.match(markup, /class="easol-intro-headline"[\s\S]*SELL MORE[\s\S]*YOUR WAY/);
    assert.match(markup, /class="easol-intro-categories"[\s\S]*FESTIVALS[\s\S]*FOOD \+ DRINK[\s\S]*ADVENTURE/);
    assert.match(markup, /class="easol-intro-media easol-intro-media-top"[\s\S]*images\/main_bg4\.jpg/);
    assert.match(markup, /class="easol-intro-media easol-intro-media-wide"[\s\S]*images\/main_bg2\.jpg/);
    assert.match(markup, /class="easol-intro-copy"[\s\S]*Travelgram is the map-first archive/);
    assert.match(markup, /class="easol-intro-proof"[\s\S]*IBIZA ROCKS[\s\S]*LOVE TRAILS/);
    assert.match(markup, /class="easol-intro-bottom"[\s\S]*class="easol-intro-bottom-art"[\s\S]*class="easol-intro-bottom-copy"/);
    assert.match(styles, /\.home-easol-intro\s*\{[^}]*background:\s*var\(--bg\);[^}]*color:\s*#050505;/s);
    assert.match(styles, /\.easol-intro-nav\s*\{[^}]*position:\s*sticky;[^}]*top:\s*64px;[^}]*background:\s*var\(--bg\);/s);
    assert.match(styles, /\.easol-intro-headline\s*\{[^}]*font-size:\s*clamp\(88px,\s*16vw,\s*228px\);/s);
    assert.match(styles, /\.easol-intro-grid\s*\{[^}]*grid-template-columns:\s*minmax\(280px,\s*0\.78fr\)\s*minmax\(0,\s*1\.04fr\);/s);
    assert.match(styles, /\.easol-intro-bottom\s*\{[^}]*background:\s*var\(--bg\);/s);
});

test('home private workspace is only visible after login', () => {
    const markup = html();
    const styles = css();
    const app = source();

    assert.match(markup, /<body[^>]*class="is-logged-out"/);
    assert.match(styles, /body\.is-logged-out\s+\.home-workspace\s*\{[^}]*display:\s*none;/s);
    assert.match(styles, /body\.is-logged-in\s+\.home-workspace\s*\{[^}]*display:\s*block;/s);
    assert.match(app, /document\.body\.classList\.toggle\('is-logged-in', Boolean\(state\.currentUser\)\)/);
    assert.match(app, /document\.body\.classList\.toggle\('is-logged-out', !state\.currentUser\)/);
});

test('logged-in home hides public intro sections and shows only the private workspace', () => {
    const styles = css();

    assert.match(styles, /body\.is-logged-in\s+\.home-workspace\s*\{[^}]*display:\s*block;/s);
    assert.match(styles, /body\.is-logged-in\s+\.hero,[\s\S]*body\.is-logged-in\s+\.home-public-preview,[\s\S]*body\.is-logged-in\s+\.home-explore-guide,[\s\S]*body\.is-logged-in\s+\.home-album-guide,[\s\S]*body\.is-logged-in\s+\.home-reference-section,[\s\S]*body\.is-logged-in\s+\.home-experience-commerce,[\s\S]*body\.is-logged-in\s+\.home-easol-intro[\s\S]*\{[^}]*display:\s*none;/s);
});

test('photo detail modal keeps the right information panel inside the viewport', () => {
    const styles = css();

    assert.match(styles, /\.photo-detail-card section\s*\{[^}]*min-width:\s*0;/s);
    assert.match(styles, /\.photo-detail-card\s*\{[^}]*width:\s*min\(1180px,\s*calc\(100vw - 32px\)\);/s);
    assert.match(styles, /\.photo-detail-card\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(260px,\s*320px\);/s);
    assert.match(styles, /\.photo-detail-card\s*\{[^}]*align-items:\s*start;/s);
    assert.match(styles, /\.photo-detail-card section\s*\{[^}]*align-self:\s*start;/s);
    assert.match(styles, /\.photo-detail-card > img\s*\{[^}]*height:\s*auto;/s);
    assert.match(styles, /\.photo-detail-card > img\s*\{[^}]*max-height:\s*calc\(100vh - 48px\);/s);
    assert.doesNotMatch(styles, /\.photo-detail-card > img\s*\{[^}]*min-height:/s);
});

test('empty recent photo notice uses the same empty card style as the album notice', () => {
    const app = source();
    const styles = css();

    const recentStart = app.indexOf('<article class="empty-state album-empty-state recent-photo-empty">');
    const albumStart = app.indexOf('<article class="empty-state album-empty-state">');

    assert.notEqual(recentStart, -1);
    assert.notEqual(albumStart, -1);
    assert.match(app.slice(recentStart, recentStart + 360), /data-route="upload"/);
    assert.match(styles, /\.recent-photo-grid article\.recent-photo-empty\s*\{[^}]*aspect-ratio:\s*auto;[^}]*min-height:\s*112px;/s);
    assert.doesNotMatch(styles, /\.recent-photo-empty button\s*\{/);
});
