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
        'home-story-band',
        'home-flow-title',
        'process-grid',
    ]) {
        assert.equal(markup.includes(removed), false, `${removed} should be removed`);
    }
});

test('home no longer renders the bottom map-photo animation section', () => {
    const markup = html();

    assert.doesNotMatch(markup, /class="hero-world-map"/);
    assert.doesNotMatch(markup, /class="hero-photo-slider"/);
    assert.doesNotMatch(markup, /data-hero-map-pin/);
    assert.doesNotMatch(markup, /images\/home-world-map\.png/);
});

test('home keeps only the remaining public explanation sections before the private workspace', () => {
    const markup = html();
    const styles = css();

    const housesIndex = markup.indexOf('class="white-band home-houses-reference"');
    const dividerIndex = markup.indexOf('class="home-section-divider"');
    const featureStoriesIndex = markup.indexOf('class="home-feature-stories"');
    const workspaceIndex = markup.indexOf('class="home-workspace page-container"');

    assert.ok(housesIndex > -1);
    assert.ok(dividerIndex > housesIndex);
    assert.ok(featureStoriesIndex > dividerIndex);
    assert.ok(workspaceIndex > featureStoriesIndex);
    assert.ok(workspaceIndex > -1);
    assert.equal(markup.match(/<article class="home-feature-story(?:\s|")/g)?.length, 3);
    assert.match(markup, /class="home-feature-stories"[\s\S]*images\/home-map-memory-board\.png[\s\S]*지도에 핀을 찍듯이 사진을 지도에 직접 올려보세요/);
    assert.match(markup, /class="home-feature-stories"[\s\S]*images\/home-travel-replay\.png[\s\S]*날짜와 장소를 따라 여행의 흐름을 다시 엮습니다/);
    assert.match(markup, /class="home-feature-stories"[\s\S]*images\/home-explore-guide\.png[\s\S]*지도를 움직이며 사진이 남겨진 장소를 찾아보세요/);
    assert.match(markup, /class="home-feature-story home-feature-story--explore"[\s\S]*장소를 검색하고,[\s\S]*Explore 흐름을 홈에서 먼저 보여줍니다\.[\s\S]*Explore 열기[\s\S]*내 사진 올리기/);
    assert.doesNotMatch(markup, /class="content-band home-explore-guide"/);
    assert.doesNotMatch(markup, /class="editorial-feature editorial-feature--korean"/);
    assert.doesNotMatch(markup, /class="hero-world-map"/);
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
    assert.match(styles, /\.home-feature-stories\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*none;[^}]*padding-left:\s*max\(24px,\s*calc\(\(100% - var\(--container\)\)\s*\/\s*2\)\);[^}]*padding-right:\s*max\(24px,\s*calc\(\(100% - var\(--container\)\)\s*\/\s*2\)\);/s);
    assert.match(styles, /\.home-feature-story\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.22fr\)\s*minmax\(320px,\s*0\.78fr\);[^}]*padding:\s*78px 0;/s);
    assert.match(styles, /\.home-feature-story__media\s*\{[^}]*aspect-ratio:\s*auto;[^}]*border:\s*0;[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/s);
    assert.doesNotMatch(styles, /\.home-feature-story__media::before\s*\{/);
    assert.match(styles, /\.home-feature-story__media img\s*\{[^}]*height:\s*auto;[^}]*box-sizing:\s*border-box;[^}]*padding:\s*0;[^}]*filter:\s*[\s\S]*drop-shadow\(0 28px 56px rgba\(26,\s*77,\s*78,\s*0\.18\)\)[\s\S]*object-fit:\s*contain;/s);
    assert.match(styles, /\.home-feature-story__actions\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;[^}]*gap:\s*10px;/s);
});

test('home starts the landing flow with the Ikkyee collage and feature stories', () => {
    const markup = html();
    const styles = css();

    const pageHomeIndex = markup.indexOf('<section id="page-home"');
    const housesIndex = markup.indexOf('class="white-band home-houses-reference"');
    const dividerIndex = markup.indexOf('class="home-section-divider"');
    const featureStoriesIndex = markup.indexOf('class="home-feature-stories"');
    const workspaceIndex = markup.indexOf('class="home-workspace page-container"');

    assert.ok(pageHomeIndex > -1);
    assert.ok(housesIndex > pageHomeIndex);
    assert.ok(dividerIndex > housesIndex);
    assert.ok(featureStoriesIndex > dividerIndex);
    assert.ok(workspaceIndex > featureStoriesIndex);
    assert.match(markup, /class="home-houses-reference__word"[^>]*>Ikkyee</);
    assert.match(markup, /이 사진은 어디서 찍은 거지\?/);
    assert.match(markup, /Ikkyee에서 취향에 맞는 사진과 장소를 알아가세요\./);
    assert.doesNotMatch(markup, /class="home-houses-reference__action"/);
    assert.doesNotMatch(markup, /공개 장소 둘러보기/);
    assert.doesNotMatch(styles, /\.home-houses-reference__action\s*\{/);
    assert.match(markup, /class="home-houses-reference__collage"[\s\S]*home-houses-reference__photo--a[\s\S]*home-houses-reference__photo--e/);
    assert.doesNotMatch(markup, /home-houses-reference__divider/);
    assert.match(markup, /class="home-section-divider"[\s\S]*images\/home-section-divider\.png[\s\S]*width="2172"[\s\S]*height="724"/);
    assert.doesNotMatch(markup, /home-houses-reference__mapline/);
    assert.doesNotMatch(markup, /home-houses-reference__photo--f/);
    assert.doesNotMatch(markup, /France · Paris/);
    assert.doesNotMatch(markup, /home-houses-reference__base/);
    assert.match(markup, /<figcaption>France · Nice<\/figcaption>/);
    assert.match(markup, /<figcaption>Japan · Kyoto<\/figcaption>/);
    assert.match(markup, /<figcaption>Morocco · Merzouga<\/figcaption>/);
    assert.equal(markup.match(/data-home-photo-detail/g)?.length, 5);
    assert.match(markup, /data-home-photo-title="거리와 카페가 있는 여행 사진"/);
    assert.match(markup, /data-home-photo-location="Switzerland · Interlaken"/);
    assert.match(markup, /data-home-photo-date="2025-06-18"/);
    assert.match(markup, /data-home-photo-lat="46\.6863"/);
    assert.doesNotMatch(markup, /class="home-houses-reference__info-panel"/);
    assert.doesNotMatch(markup, /data-home-photo-panel/);
    assert.doesNotMatch(markup, /data-home-photo-close/);
    assert.match(styles, /--houses-surface:\s*var\(--bg\);/);
    assert.match(styles, /--houses-word:\s*rgba\(26,\s*77,\s*78,\s*0\.16\);/);
    assert.doesNotMatch(styles, /--houses-base:/);
    assert.doesNotMatch(styles, /\.home-houses-reference::before\s*\{/);
    assert.doesNotMatch(styles, /\.home-houses-reference__mapline\s*\{/);
    assert.match(styles, /\.home-houses-reference\s*\{[^}]*linear-gradient\(180deg,\s*var\(--houses-surface\)\s*0%,\s*var\(--houses-surface\)\s*78%,\s*var\(--surface\)\s*100%\);[^}]*padding-top:\s*140px;[^}]*padding-bottom:\s*96px;/s);
    assert.doesNotMatch(styles, /\.home-houses-reference\s*\{[^}]*background-size:\s*72px 72px/s);
    assert.match(styles, /\.home-houses-reference__word\s*\{[^}]*font-size:\s*clamp\(300px,\s*36vw,\s*660px\);[^}]*letter-spacing:\s*0;/s);
    assert.match(styles, /\.home-houses-reference__copy\s*\{[^}]*font-size:\s*23px;[^}]*font-weight:\s*700;[^}]*line-height:\s*1\.56;/s);
    assert.match(styles, /\.home-houses-reference__content\s*\{[^}]*padding-top:\s*clamp\(300px,\s*calc\(31vw - 120px\),\s*440px\);/s);
    assert.match(styles, /\.home-houses-reference__collage\s*\{[^}]*height:\s*560px;[^}]*margin-top:\s*78px;/s);
    assert.doesNotMatch(styles, /\.home-houses-reference__collage::before\s*\{/);
    assert.doesNotMatch(styles, /\.home-houses-reference__base\s*\{/);
    assert.match(styles, /\.home-houses-reference__photo\s*\{[^}]*box-shadow:\s*[\s\S]*0 30px 70px rgba\(70,\s*40,\s*32,\s*0\.22\),[\s\S]*0 12px 28px rgba\(26,\s*77,\s*78,\s*0\.12\);/s);
    assert.doesNotMatch(styles, /\.home-houses-reference__divider/);
    assert.match(styles, /\.home-section-divider\s*\{[^}]*height:\s*clamp\(108px,\s*16vw,\s*220px\);[^}]*margin-top:\s*clamp\(-48px,\s*-3vw,\s*-24px\);[^}]*margin-bottom:\s*clamp\(-48px,\s*-3vw,\s*-24px\);[^}]*background:\s*var\(--surface\);/s);
    assert.match(styles, /\.home-section-divider img\s*\{[^}]*display:\s*block;[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*cover;[^}]*object-position:\s*center 52%;/s);
    assert.match(styles, /\.home-houses-reference__photo figcaption\s*\{[^}]*opacity:\s*0;/s);
    assert.match(styles, /\.home-houses-reference__photo:hover figcaption,[\s\S]*\.home-houses-reference__photo:focus-visible figcaption\s*\{[^}]*opacity:\s*1;/s);
    assert.doesNotMatch(styles, /\.home-houses-reference__info-panel/);
    assert.match(styles, /\.home-houses-reference__photo--c\s*\{[^}]*width:\s*284px;/s);
});

test('home collage photos reuse the existing photo detail modal', () => {
    const app = source();

    assert.match(app, /function getHomeReferencePhotoDetail\(trigger\)\s*\{/);
    assert.match(app, /function openHomeReferencePhotoDetail\(trigger\)\s*\{/);
    assert.doesNotMatch(app, /function openHomePhotoInfoPanel/);
    assert.doesNotMatch(app, /function closeHomePhotoInfoPanel/);
    assert.match(app, /event\.target\.closest\('\[data-home-photo-detail\]'\)/);
    assert.match(app, /if \(!\['Enter', ' '\]\.includes\(event\.key\)/);
    assert.match(app, /updatePhotoDetailModal\(photo,\s*\{\s*context:\s*'photo'\s*\}\);/);
    assert.match(app, /openModal\('#photo-detail-modal'\);/);
    assert.match(app, /placeName:\s*trigger\?\.dataset\?\.homePhotoLocation/);
});

test('logged-in home hides the houses reference with the other public intro bands', () => {
    const styles = css();

    const hiddenWhiteBandIndex = styles.indexOf('body.is-logged-in .hero,');
    const hiddenWhiteBandRuleEnd = styles.indexOf('}', hiddenWhiteBandIndex);

    assert.ok(hiddenWhiteBandIndex > -1);
    assert.ok(hiddenWhiteBandRuleEnd > hiddenWhiteBandIndex);
    assert.match(styles.slice(hiddenWhiteBandIndex, hiddenWhiteBandRuleEnd), /body\.is-logged-in\s+\.white-band/);
    assert.match(styles.slice(hiddenWhiteBandIndex, hiddenWhiteBandRuleEnd), /body\.is-logged-in\s+\.home-houses-reference/);
    assert.match(styles.slice(hiddenWhiteBandIndex, hiddenWhiteBandRuleEnd), /body\.is-logged-in\s+\.home-section-divider/);
    assert.match(styles.slice(hiddenWhiteBandIndex, hiddenWhiteBandRuleEnd), /body\.is-logged-in\s+\.home-feature-stories/);
    assert.match(styles.slice(hiddenWhiteBandIndex, hiddenWhiteBandRuleEnd), /display:\s*none;/);
    assert.doesNotMatch(styles, /body\.is-logged-in\s+\.home-houses-reference\s*\{[^}]*display:\s*block;/s);
});

test('logo landing route keeps the public introduction visible for signed-in users', () => {
    const styles = css();
    const app = source();

    assert.match(app, /const LANDING_ROUTE = 'landing';/);
    assert.match(app, /document\.body\.dataset\.page = normalized === LANDING_ROUTE \? LANDING_ROUTE : renderedRoute;/);
    assert.match(styles, /body\.is-logged-in\[data-page="landing"\]\s+\.home-workspace\s*\{[^}]*display:\s*none;/s);
    assert.match(styles, /body\.is-logged-in\[data-page="landing"\]\s+\.home-houses-reference,[\s\S]*body\.is-logged-in\[data-page="landing"\]\s+\.white-band\s*\{[^}]*display:\s*block;/s);
    assert.match(styles, /body\.is-logged-in\[data-page="landing"\]\s+\.home-feature-stories\s*\{[^}]*display:\s*grid;/s);
});

test('logged-in home panels and thumbnails follow the explore visual language', () => {
    const styles = css();

    assert.match(styles, /body\.is-logged-in\s+\.home-workspace\s+\.recent-photo-section,[\s\S]*body\.is-logged-in\s+\.home-workspace\s+\.dashboard-panel,[\s\S]*body\.is-logged-in\s+\.home-workspace\s+\.album-panel\s*\{[^}]*border:\s*0;[^}]*border-radius:\s*0;[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/s);
    assert.doesNotMatch(styles, /body\.is-logged-in\s+\.home-workspace\s+\.attention-banner\s*\{/s);
    assert.match(styles, /\.compact-action-button\s*\{[^}]*min-height:\s*40px;[^}]*border-radius:\s*999px;/s);
    assert.match(styles, /body\.is-logged-in\s+\.home-workspace\s+\.recent-photo-grid article:not\(\.recent-photo-empty\),[\s\S]*body\.is-logged-in\s+\.home-workspace\s+\.personal-photo-card\s*\{[^}]*border-radius:\s*0;/s);
    assert.match(styles, /body\.is-logged-in\s+\.home-workspace\s+\.recent-photo-grid img,[\s\S]*body\.is-logged-in\s+\.home-workspace\s+\.personal-photo-card img,[\s\S]*body\.is-logged-in\s+\.home-workspace\s+\.album-row img\s*\{[^}]*border-radius:\s*0;/s);
    assert.match(styles, /body\.is-logged-in\s+\.home-workspace\s+\.album-row\s*\{[^}]*border-radius:\s*8px;[^}]*box-shadow:/s);
});

test('home archive creation actions sit in their matching section headers', () => {
    const markup = html();
    const styles = css();
    const homeStart = markup.indexOf('class="home-workspace');
    const homeEnd = markup.indexOf('id="page-photos"', homeStart);
    const home = markup.slice(homeStart, homeEnd);
    const recentStart = home.indexOf('id="recent-photo-title"');
    const likedStart = home.indexOf('id="liked-photo-title"');
    const albumStart = home.indexOf('id="my-albums-title"');
    const recentHeader = home.slice(recentStart, likedStart);
    const likedHeader = home.slice(likedStart, albumStart);
    const albumHeader = home.slice(albumStart, home.indexOf('id="album-list"', albumStart));

    assert.doesNotMatch(home, /Home Archive/);
    assert.doesNotMatch(home, /여행 단위로 정리된 나의 앨범/);
    assert.doesNotMatch(home, /내 사진과 앨범을 정리하는 공간/);
    assert.doesNotMatch(home, /선택한 사진만 업로드됩니다/);
    assert.doesNotMatch(home, /class="myphoto-actions"/);
    assert.doesNotMatch(home, /class="action-card/);
    assert.match(recentHeader, /id="recent-photo-title" class="dashboard-section-title"[\s\S]*class="section-title-icon"[\s\S]*최근 사진/);
    assert.match(likedHeader, /id="liked-photo-title" class="dashboard-section-title"[\s\S]*class="section-title-icon"[\s\S]*좋아요한 사진/);
    assert.match(albumHeader, /id="my-albums-title" class="dashboard-section-title"[\s\S]*class="section-title-icon"[\s\S]*여행 앨범/);
    assert.match(recentHeader, /id="btn-open-upload"[^>]*>[\s\S]*class="material-symbols-outlined"[^>]*>upload<\/span>[\s\S]*사진 올리기[\s\S]*<\/button>/);
    assert.match(recentHeader, /id="btn-open-photos"[^>]*>[\s\S]*전체 보기[\s\S]*class="material-symbols-outlined"[^>]*>arrow_forward<\/span>[\s\S]*<\/button>/);
    assert.match(likedHeader, /id="btn-open-liked-photos"[^>]*data-route="liked"[^>]*>[\s\S]*전체 보기[\s\S]*class="material-symbols-outlined"[^>]*>arrow_forward<\/span>[\s\S]*<\/button>/);
    assert.doesNotMatch(albumHeader, /id="myphoto-summary"/);
    assert.match(albumHeader, /id="btn-open-album"[^>]*>[\s\S]*class="material-symbols-outlined"[^>]*>add<\/span>[\s\S]*앨범 만들기[\s\S]*<\/button>/);
    assert.match(styles, /\.dashboard-section-title\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*line-height:\s*1;/s);
    assert.match(styles, /\.section-title-icon\s*\{[^}]*width:\s*30px;[^}]*height:\s*30px;[^}]*transform:\s*translateY\(1px\);/s);
    assert.match(styles, /body\.is-logged-in \.home-workspace \.panel-topline\s*\{[^}]*min-height:\s*44px;[^}]*margin-bottom:\s*18px;/s);
    assert.match(styles, /body\.is-logged-in \.home-workspace \.recent-photo-section\s*\{[^}]*margin:\s*34px 0 0;/s);
    assert.match(styles, /body\.is-logged-in \.home-workspace \.album-panel\s*\{[^}]*margin-top:\s*34px;/s);
    assert.match(styles, /body\.is-logged-in \.home-workspace \.dashboard-section-title\s*\{[^}]*font-size:\s*24px;[^}]*font-weight:\s*850;/s);
    assert.match(styles, /body\.is-logged-in \.home-workspace #btn-open-upload,[\s\S]*body\.is-logged-in \.home-workspace #btn-open-liked-photos\s*\{[^}]*gap:\s*8px;[^}]*height:\s*42px;[^}]*border-radius:\s*8px;/s);
    assert.match(styles, /body\.is-logged-in \.home-workspace #btn-open-upload,[\s\S]*body\.is-logged-in \.home-workspace #btn-open-album\s*\{[^}]*background:\s*var\(--teal-dark\);[^}]*color:\s*#ffffff;[^}]*padding:\s*0 20px;/s);
    assert.match(styles, /body\.is-logged-in \.home-workspace #btn-open-photos,[\s\S]*body\.is-logged-in \.home-workspace #btn-open-liked-photos\s*\{[^}]*border:\s*1px solid rgba\(26,\s*77,\s*78,\s*0\.35\);[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.62\);[^}]*color:\s*var\(--teal\);/s);
    assert.match(styles, /body\.is-logged-in \.home-workspace #btn-open-upload \.material-symbols-outlined,[\s\S]*body\.is-logged-in \.home-workspace #btn-open-liked-photos \.material-symbols-outlined\s*\{[^}]*font-size:\s*18px;/s);
    assert.match(styles, /body\.is-logged-in \.home-workspace #btn-open-upload > span:not\(\.material-symbols-outlined\),[\s\S]*body\.is-logged-in \.home-workspace #btn-open-album > span:not\(\.material-symbols-outlined\)\s*\{[^}]*align-items:\s*center;[^}]*justify-content:\s*center;[^}]*color:\s*#ffffff;[^}]*font-size:\s*13px;[^}]*line-height:\s*1\.25;/s);
});

test('home album thumbnails do not expose Supabase storage copy', () => {
    const app = source();
    const savedAlbumsStart = app.indexOf('function renderSavedAlbumRows');
    const savedAlbumsEnd = app.indexOf('function renderSavedPhotoAlbums', savedAlbumsStart);
    const groupedAlbumsEnd = app.indexOf('function renderStagedPhotos', savedAlbumsEnd);
    const albumRenderers = app.slice(savedAlbumsStart, groupedAlbumsEnd);

    assert.doesNotMatch(albumRenderers, /Supabase/);
    assert.doesNotMatch(albumRenderers, /status-line[\s\S]*Supabase/);
    assert.doesNotMatch(albumRenderers, /<small>\$\{formatPhotoCount\(albumPhotos\.length\)\} · Supabase<\/small>/);
    assert.doesNotMatch(albumRenderers, /\$\{visibilityLabel\}/);
    assert.doesNotMatch(albumRenderers, /앨범 기록/);
    assert.doesNotMatch(albumRenderers, /비공개'} · 저장됨/);
    assert.match(albumRenderers, /<small><span class="material-symbols-outlined">\$\{visibilityIcon\}<\/span>\$\{formatPhotoCount\(album\.photo_count\)\}<\/small>/);
    assert.match(albumRenderers, /<small><span class="material-symbols-outlined">\$\{shared \? 'public' : 'lock'\}<\/span>\$\{formatPhotoCount\(albumPhotos\.length\)\}<\/small>/);
});

test('recent photos full view uses recent-photo naming without intro copy', () => {
    const markup = html();
    const styles = css();
    const photosStart = markup.indexOf('id="page-photos"');
    const likedStart = markup.indexOf('id="page-liked"', photosStart);
    const photosPage = markup.slice(photosStart, likedStart);

    assert.match(photosPage, /<h1 id="photos-title">최근사진<\/h1>/);
    assert.doesNotMatch(photosPage, /Personal Photos/);
    assert.doesNotMatch(photosPage, /개별사진/);
    assert.doesNotMatch(photosPage, /앨범으로 묶지 않은 개인 사진을 확인하고/);
    assert.match(photosPage, /class="page-container photo-page-container"/);
    assert.doesNotMatch(photosPage, /<h2>내가 올린 사진<\/h2>/);
    assert.match(styles, /\.photo-page-container\s*\{[^}]*padding-top:\s*32px;/s);
    assert.match(styles, /\.photo-page-container \.back-link\s*\{[^}]*margin-bottom:\s*24px;/s);
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

test('home no longer renders the bottom Korean editorial section', () => {
    const markup = html();

    assert.doesNotMatch(markup, /class="editorial-feature editorial-feature--korean"/);
    assert.doesNotMatch(markup, /class="editorial-feature__hero"/);
    assert.doesNotMatch(markup, /class="editorial-feature__header"/);
    assert.doesNotMatch(markup, /class="editorial-feature__brand"/);
    assert.doesNotMatch(markup, /class="editorial-feature__nav"/);
    assert.doesNotMatch(markup, /class="editorial-feature__headline"[\s\S]*흩어진 사진을 하나로/);
    assert.doesNotMatch(markup, /class="editorial-feature__statement"[^>]*>지도 위에 남기다</);
    assert.doesNotMatch(markup, /class="editorial-feature__wide-image"/);
    assert.doesNotMatch(markup, /class="editorial-feature__side-image"/);
    assert.doesNotMatch(markup, /class="editorial-feature__large-image"/);
    assert.doesNotMatch(markup, /class="editorial-feature__proof"/);
    assert.doesNotMatch(markup, /class="intro-image-section"/);
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
    assert.match(styles, /body\.is-logged-in\s+\.hero,[\s\S]*body\.is-logged-in\s+\.home-feature-stories,[\s\S]*body\.is-logged-in\s+\.editorial-feature[\s\S]*\{[^}]*display:\s*none;/s);
});

test('site footer provides global archive information after the app pages', () => {
    const markup = html();
    const styles = css();

    const mainEndIndex = markup.indexOf('</main>');
    const footerIndex = markup.indexOf('class="site-footer"');

    assert.ok(mainEndIndex > -1);
    assert.ok(footerIndex > mainEndIndex);
    assert.match(markup, /<footer class="site-footer" aria-labelledby="site-footer-title">/);
    assert.match(markup, /<h2 id="site-footer-title">Ikkyee<\/h2>/);
    assert.match(markup, /장소로 기억하는 여행 사진 아카이브/);
    assert.match(markup, /href="#\/">Home<\/a>/);
    assert.match(markup, /href="#\/explore">Explore<\/a>/);
    assert.match(markup, /사진은 기본 비공개로 보관됩니다\./);
    assert.match(styles, /\.site-footer\s*\{[^}]*border-top:\s*0;[^}]*radial-gradient\(circle at 12% 18%,\s*rgba\(255,\s*255,\s*255,\s*0\.14\),\s*transparent 34%\),[\s\S]*linear-gradient\(135deg,\s*var\(--teal-dark\)\s*0%,\s*var\(--teal\)\s*100%\);/s);
    assert.match(styles, /\.site-footer__inner\s*\{[^}]*grid-template-columns:/s);
    assert.match(styles, /\.site-footer__nav a:hover,[\s\S]*\.site-footer__nav a:focus-visible\s*\{[^}]*background:\s*var\(--surface\);[^}]*color:\s*var\(--teal-dark\);/s);
});

test('photo detail modal keeps the right information panel inside the viewport', () => {
    const styles = css();

    assert.match(styles, /\.photo-detail-card section\s*\{[^}]*min-width:\s*0;/s);
    assert.match(styles, /\.photo-detail-card\s*\{[^}]*width:\s*min\(1220px,\s*calc\(100vw - 44px\)\);/s);
    assert.match(styles, /\.photo-detail-card\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(300px,\s*380px\);/s);
    assert.match(styles, /\.photo-detail-card\s*\{[^}]*align-items:\s*stretch;/s);
    assert.match(styles, /\.photo-detail-card section\s*\{[^}]*align-self:\s*stretch;/s);
    assert.match(styles, /\.photo-detail-card > img\s*\{[^}]*height:\s*min\(76vh,\s*760px\);/s);
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

test('home and personal photo cards omit visible caption wrappers', () => {
    const app = source();
    const personalStart = app.indexOf('function renderPersonalPhotosPage');
    const personalEnd = app.indexOf('async function deleteSelectedPersonalPhotos', personalStart);
    const personalRenderer = app.slice(personalStart, personalEnd);
    const likedStart = app.indexOf('function renderLikedPhotoSurfaces');
    const likedEnd = app.indexOf('function renderPersonalPhotosPage', likedStart);
    const likedRenderer = app.slice(likedStart, likedEnd);

    assert.doesNotMatch(personalRenderer, /const description = getPhotoDescriptionText\(photo\)/);
    assert.doesNotMatch(personalRenderer, /<strong>\$\{escapeHtml\(description\)\}<\/strong>/);
    assert.doesNotMatch(personalRenderer, /<strong>\$\{escapeHtml\(getPhotoFallbackLabel\(photo\)\)\}<\/strong>/);
    assert.match(personalRenderer, /<article class="personal-photo-card \$\{isSelected \? 'is-selected' : ''\} \$\{shouldAnimateSelection \? 'is-selection-animated' : ''\}"[^>]*>\s*<button class="photo-select-button"[^>]*><\/button>\s*<img src="\$\{photo\.url\}" alt="\$\{escapeHtml\(getPhotoFallbackLabel\(photo\)\)\}">\s*<\/article>/s);
    assert.doesNotMatch(likedRenderer, /const description = getPhotoDescriptionText\(photo\)/);
    assert.doesNotMatch(likedRenderer, /<strong>\$\{escapeHtml\(description\)\}<\/strong>/);
    assert.doesNotMatch(likedRenderer, /<strong>\$\{escapeHtml\(getPhotoFallbackLabel\(photo\)\)\}<\/strong>/);
    assert.match(likedRenderer, /<article class="personal-photo-card liked-photo-card"[^>]*>\s*<img src="\$\{photo\.url\}" alt="\$\{escapeHtml\(getPhotoFallbackLabel\(photo\)\)\}">\s*<\/article>/s);
});
