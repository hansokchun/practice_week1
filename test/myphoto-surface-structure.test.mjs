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

    const housesIndex = markup.indexOf('class="white-band home-houses-reference"');
    const introImageIndex = markup.indexOf('class="editorial-feature editorial-feature--korean"');
    const heroIndex = markup.indexOf('<div class="hero">');
    const exploreIndex = markup.indexOf('class="content-band home-explore-guide"');
    const workspaceIndex = markup.indexOf('class="home-workspace page-container"');

    assert.ok(housesIndex > -1);
    assert.ok(introImageIndex > -1);
    assert.ok(introImageIndex > housesIndex);
    assert.ok(heroIndex > introImageIndex);
    assert.ok(exploreIndex > -1);
    assert.ok(exploreIndex > heroIndex);
    assert.ok(workspaceIndex > exploreIndex);
    assert.ok(workspaceIndex > -1);
    assert.match(markup, /images\/home-explore-guide\.png/);
    assert.doesNotMatch(markup, /class="home-easol-intro"/);
    assert.doesNotMatch(markup, /SELL MORE/);
    assert.doesNotMatch(markup, /EXPERIENCES/);
    assert.doesNotMatch(markup, /YOUR WAY/);
    assert.doesNotMatch(markup, /class="content-band home-album-guide"/);
    assert.doesNotMatch(markup, /class="content-band home-public-preview"/);
    assert.doesNotMatch(markup, /data-reference-style="polarsteps"/);
    assert.doesNotMatch(markup, /data-reference-style="findpenguins"/);
    assert.doesNotMatch(markup, /data-reference-style="journi"/);
    assert.doesNotMatch(markup, /class="home-experience-commerce"/);
    assert.match(styles, /\.home-explore-guide\s*\{[^}]*grid-template-columns:\s*minmax\(320px,\s*0\.78fr\)\s*minmax\(0,\s*1\.22fr\);/s);
});

test('home starts the landing flow with the Ikkyee editorial collage section', () => {
    const markup = html();
    const styles = css();

    const pageHomeIndex = markup.indexOf('<section id="page-home"');
    const housesIndex = markup.indexOf('class="white-band home-houses-reference"');
    const introImageIndex = markup.indexOf('class="editorial-feature editorial-feature--korean"');

    assert.ok(pageHomeIndex > -1);
    assert.ok(housesIndex > pageHomeIndex);
    assert.ok(housesIndex < introImageIndex);
    assert.match(markup, /class="home-houses-reference__word"[^>]*>Ikkyee</);
    assert.match(markup, /이 사진은 어디서 찍은 걸까\?/);
    assert.match(markup, /Ikkyee에서 장소와 여행자의 기록을 확인하세요\./);
    assert.doesNotMatch(markup, /class="home-houses-reference__action"/);
    assert.doesNotMatch(markup, /공개 장소 둘러보기/);
    assert.doesNotMatch(styles, /\.home-houses-reference__action\s*\{/);
    assert.match(markup, /class="home-houses-reference__collage"[\s\S]*home-houses-reference__photo--a[\s\S]*home-houses-reference__photo--e/);
    assert.doesNotMatch(markup, /home-houses-reference__divider/);
    assert.doesNotMatch(markup, /home-houses-reference__mapline/);
    assert.doesNotMatch(markup, /home-houses-reference__photo--f/);
    assert.doesNotMatch(markup, /France · Paris/);
    assert.doesNotMatch(markup, /home-houses-reference__base/);
    assert.match(markup, /<figcaption>France · Nice<\/figcaption>/);
    assert.match(markup, /<figcaption>Japan · Kyoto<\/figcaption>/);
    assert.match(markup, /<figcaption>Morocco · Merzouga<\/figcaption>/);
    assert.match(styles, /--houses-surface:\s*var\(--bg\);/);
    assert.match(styles, /--houses-word:\s*rgba\(26,\s*77,\s*78,\s*0\.16\);/);
    assert.doesNotMatch(styles, /--houses-base:/);
    assert.doesNotMatch(styles, /\.home-houses-reference::before\s*\{/);
    assert.doesNotMatch(styles, /\.home-houses-reference__mapline\s*\{/);
    assert.match(styles, /\.home-houses-reference\s*\{[^}]*background:\s*var\(--houses-surface\);[^}]*padding-top:\s*140px;[^}]*padding-bottom:\s*96px;/s);
    assert.match(styles, /\.home-houses-reference__word\s*\{[^}]*font-size:\s*clamp\(250px,\s*30vw,\s*540px\);[^}]*letter-spacing:\s*0\.015em;/s);
    assert.match(styles, /\.home-houses-reference__collage\s*\{[^}]*height:\s*560px;[^}]*margin-top:\s*78px;/s);
    assert.doesNotMatch(styles, /\.home-houses-reference__base\s*\{/);
    assert.match(styles, /\.home-houses-reference__photo\s*\{[^}]*box-shadow:\s*[\s\S]*0 30px 70px rgba\(70,\s*40,\s*32,\s*0\.22\),[\s\S]*0 12px 28px rgba\(26,\s*77,\s*78,\s*0\.12\);/s);
    assert.doesNotMatch(styles, /\.home-houses-reference__divider/);
    assert.match(styles, /\.home-houses-reference__photo figcaption\s*\{[^}]*opacity:\s*0;/s);
    assert.match(styles, /\.home-houses-reference__photo:hover figcaption,[\s\S]*\.home-houses-reference__photo:focus-within figcaption\s*\{[^}]*opacity:\s*1;/s);
    assert.match(styles, /\.home-houses-reference__photo--c\s*\{[^}]*width:\s*284px;/s);
});

test('logged-in home keeps the houses reference visible after white bands are hidden', () => {
    const styles = css();

    const hiddenWhiteBandIndex = styles.indexOf('body.is-logged-in .hero,');
    const hiddenWhiteBandRuleEnd = styles.indexOf('}', hiddenWhiteBandIndex);
    const housesVisibleIndex = styles.indexOf('body.is-logged-in .home-houses-reference');

    assert.ok(hiddenWhiteBandIndex > -1);
    assert.ok(hiddenWhiteBandRuleEnd > hiddenWhiteBandIndex);
    assert.match(styles.slice(hiddenWhiteBandIndex, hiddenWhiteBandRuleEnd), /body\.is-logged-in\s+\.white-band/);
    assert.match(styles.slice(hiddenWhiteBandIndex, hiddenWhiteBandRuleEnd), /display:\s*none;/);
    assert.ok(housesVisibleIndex > hiddenWhiteBandRuleEnd);
    assert.match(styles.slice(housesVisibleIndex, styles.indexOf('}', housesVisibleIndex)), /display:\s*block;/);
});

test('home no longer renders the removed easol intro sections', () => {
    const markup = html();

    assert.doesNotMatch(markup, /class="easol-intro-media easol-intro-media-top"/);
    assert.doesNotMatch(markup, /class="home-easol-intro"/);
    assert.doesNotMatch(markup, /class="easol-intro-brand"/);
    assert.doesNotMatch(markup, /class="easol-intro-headline"/);
    assert.doesNotMatch(markup, /class="easol-intro-categories"/);
    assert.doesNotMatch(markup, /Travelgram is the map-first archive/);
    assert.doesNotMatch(markup, /class="easol-intro-bottom"/);
    assert.doesNotMatch(markup, /THE GAME IS CHANGING/);
    assert.doesNotMatch(markup, /INTRODUCING/);
});

test('home keeps the Korean editorial section without a duplicated local header', () => {
    const markup = html();
    const styles = css();

    assert.match(markup, /class="editorial-feature editorial-feature--korean"[\s\S]*class="editorial-feature__hero"[\s\S]*class="editorial-feature__intro"/);
    assert.doesNotMatch(markup, /class="editorial-feature__header"/);
    assert.doesNotMatch(markup, /class="editorial-feature__brand"/);
    assert.doesNotMatch(markup, /class="editorial-feature__nav"/);
    assert.match(markup, /class="editorial-feature__headline"[\s\S]*흩어진 사진을 하나로/);
    assert.match(markup, /class="editorial-feature__statement"[^>]*>지도 위에 남기다</);
    assert.match(markup, /class="editorial-feature__wide-image"[\s\S]*images\/main_bg2\.jpg/);
    assert.match(markup, /class="editorial-feature__side-image"[\s\S]*images\/main_bg5\.jpg/);
    assert.match(markup, /class="editorial-feature__large-image"[\s\S]*images\/main_bg3\.jpg/);
    assert.match(markup, /class="editorial-feature__proof"[\s\S]*IBIZA ROCKS[\s\S]*GCN[\s\S]*LOVE TRAILS[\s\S]*ENVISION/);
    assert.doesNotMatch(markup, /class="intro-image-section"/);
    assert.match(styles, /\.editorial-feature--korean\s*\{[^}]*width:\s*100%;[^}]*overflow:\s*hidden;[^}]*background:\s*transparent;[^}]*color:\s*#050505;/s);
    assert.match(styles, /\.editorial-feature--korean\s+\.editorial-feature__inner\s*\{[^}]*width:\s*1360px;[^}]*min-width:\s*1360px;[^}]*margin:\s*0 auto;/s);
    assert.match(styles, /\.editorial-feature--korean\s+\.editorial-feature__hero\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);[^}]*padding-right:\s*312px;/s);
    assert.match(styles, /\.editorial-feature--korean\s+\.editorial-feature__side-image\s*\{[^}]*position:\s*absolute;[^}]*top:\s*42px;[^}]*right:\s*0;[^}]*width:\s*232px;/s);
    assert.match(styles, /\.editorial-feature--korean\s+\.editorial-feature__headline\s*\{[^}]*width:\s*912px;[^}]*max-width:\s*912px;[^}]*font-size:\s*188px;[^}]*line-height:\s*0\.91;[^}]*letter-spacing:\s*-0\.068em;[^}]*transform:\s*scaleX\(0\.74\);/s);
    assert.match(styles, /\.editorial-feature--korean\s+\.editorial-feature__categories\s*\{[^}]*gap:\s*56px;[^}]*margin-top:\s*22px;/s);
    assert.match(styles, /\.editorial-feature--korean\s+\.editorial-feature__hero-row\s*\{[^}]*grid-template-columns:\s*744px\s*500px;[^}]*gap:\s*44px;/s);
    assert.match(styles, /\.editorial-feature--korean\s+\.editorial-feature__statement\s*\{[^}]*width:\s*472px;[^}]*max-width:\s*472px;[^}]*font-size:\s*134px;[^}]*line-height:\s*0\.88;[^}]*letter-spacing:\s*-0\.07em;[^}]*transform:\s*scaleX\(0\.68\);/s);
    assert.match(styles, /\.editorial-feature--korean\s+\.editorial-feature__intro\s*\{[^}]*grid-template-columns:\s*454px\s*790px;[^}]*gap:\s*44px;/s);
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
    assert.match(styles, /body\.is-logged-in\s+\.hero,[\s\S]*body\.is-logged-in\s+\.home-explore-guide,[\s\S]*body\.is-logged-in\s+\.editorial-feature[\s\S]*\{[^}]*display:\s*none;/s);
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
