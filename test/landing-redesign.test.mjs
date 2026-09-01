import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
    getDefaultLandingSections,
    getLandingSearchResults,
    getLandingSectionPhotos,
    getLandingVisiblePhotos,
    isLandingAdmin,
    normalizeLandingSections
} from '../js/landing-sections.mjs';

const root = new URL('../', import.meta.url);

test('랜딩은 큰 검색창, 추천 검색어, 가로 사진 섹션을 제공한다', async () => {
    const html = await readFile(new URL('index.html', root), 'utf8');
    const app = await readFile(new URL('js/app.js', root), 'utf8');
    assert.match(html, /id="landing-search"/);
    assert.match(html, /id="landing-search-input"/);
    assert.match(html, /class="landing-search-suggestions"/);
    assert.match(html, /class="landing-search-globe" src="images\/landing-globe-sprout-route\.jpg"[^>]*width="1536"[^>]*height="1024"/);
    assert.match(html, /id="landing-sections"/);
    assert.match(html, /data-landing-scroll/);
    assert.match(html, /placeholder="도시, 장소, 분위기를 검색하세요"/);
    assert.match(html, /data-landing-query="일본"/);
    assert.doesNotMatch(html, /data-landing-query="부산"/);
    assert.match(app, /function syncLandingSearchQuery\(\)/);
    assert.match(app, /'input', syncLandingSearchQuery/);
    assert.match(app, /'search', syncLandingSearchQuery/);
});

test('검색창 위에는 지정한 제목만 표시한다', async () => {
    const html = await readFile(new URL('index.html', root), 'utf8');
    const css = await readFile(new URL('style.css', root), 'utf8');
    const landingStart = html.indexOf('class="landing-discovery"');
    const heroStart = html.indexOf('class="landing-search-hero"');
    const searchStart = html.indexOf('id="landing-search"', heroStart);
    const beforeSearch = html.slice(heroStart, searchStart);
    const beforeHero = html.slice(landingStart, heroStart);
    assert.match(beforeHero, /class="landing-search-globe" src="images\/landing-globe-sprout-route\.jpg"[^>]*width="1536"[^>]*height="1024"/);
    assert.match(beforeSearch, /<h1 id="home-title">이끼에서 당신만의 장소를 찾아보세요<\/h1>/);
    assert.doesNotMatch(beforeSearch, /<p|eyebrow|공개 여행 사진|다음 여행의 장면/);
    assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.landing-search-hero h1\s*\{[^}]*word-break:\s*keep-all;[^}]*overflow-wrap:\s*break-word;/s);
    assert.match(css, /\.landing-search-hero h1\s*\{[^}]*font-size:\s*clamp\(40px,\s*4vw,\s*56px\);/s);
    assert.match(css, /\.landing-search-hero h1\s*\{[^}]*word-break:\s*keep-all;/s);
    assert.match(css, /\.landing-discovery\s*\{[^}]*position:\s*relative;[^}]*overflow:\s*hidden;/s);
    assert.match(css, /\.landing-search-globe\s*\{[^}]*position:\s*absolute;[^}]*filter:\s*blur\(0\.6px\)/s);
    assert.match(css, /\.landing-search-globe\s*\{[^}]*mask-image:\s*linear-gradient\(to bottom,/s);
    assert.match(css, /linear-gradient\(to right, transparent 0%, #000 8%, #000 92%, transparent 100%\)/);
    assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.landing-search-hero\s*\{[^}]*padding:\s*84px 16px 44px;/s);
    assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.landing-search-hero h1\s*\{[^}]*width:\s*min\(100%,\s*350px\);[^}]*font-size:\s*28px;[^}]*white-space:\s*normal;/s);
    assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.landing-search\s*\{[^}]*min-height:\s*56px;[^}]*margin-top:\s*22px;/s);
    assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.landing-search input\s*\{[^}]*font-size:\s*16px;/s);
    assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.landing-search-suggestions\s*\{[^}]*flex-wrap:\s*nowrap;/s);
    assert.match(html, /id="btn-header-upload"[^>]*aria-label="사진 추가"/);
    assert.match(css, /@media \(max-width:\s*360px\)[\s\S]*#btn-header-upload\s*>\s*span:not\(\.material-symbols-outlined\)\s*\{[^}]*display:\s*none;/s);
    assert.match(css, /@media \(max-width:\s*360px\)[\s\S]*#btn-header-upload \.material-symbols-outlined\s*\{[^}]*display:\s*inline-block;/s);
    assert.match(css, /@media \(max-width:\s*520px\)[\s\S]*\.brand-korean\s*\{[^}]*display:\s*none;/s);
    assert.match(css, /@media \(max-width:\s*520px\)[\s\S]*#btn-header-upload\s*>\s*span:not\(\.material-symbols-outlined\)\s*\{[^}]*display:\s*none;/s);
    assert.doesNotMatch(html, /지금 둘러보기|data-landing-query="도쿄 골목"|data-landing-query="벚꽃"/);
});

test('기본 랜딩 소제목은 추천, 한국, 일본, 풍경, 도시 순서로만 구성한다', () => {
    const sections = getDefaultLandingSections();
    assert.deepEqual(sections.map(({ title }) => title), ['추천', '한국', '일본', '풍경', '도시']);
    assert.equal(sections.every(({ description }) => description === ''), true);

    const photos = Array.from({ length: 5 }, (_, index) => ({ id: String(index), visibility: 'public' }));
    assert.equal(getLandingSectionPhotos(sections[0], photos, 0).length, 5);
    assert.equal(getLandingSectionPhotos(sections[4], photos, 4).length, 5);
});

test('랜딩 사진 카드는 이미지만 표시하고 하단 글 오버레이를 두지 않는다', async () => {
    const app = await readFile(new URL('js/app.js', root), 'utf8');
    const css = await readFile(new URL('style.css', root), 'utf8');
    const cardStart = app.indexOf('function renderLandingPhotoCard');
    const cardEnd = app.indexOf('function renderLandingSections', cardStart);
    const cardRenderer = app.slice(cardStart, cardEnd);
    assert.match(cardRenderer, /<img /);
    assert.doesNotMatch(cardRenderer, /<span>/);
    assert.doesNotMatch(css, /\.landing-photo-card span\s*\{/);
    assert.match(css, /\.landing-photo-section\s*\{[^}]*min-width:\s*0;/s);
    assert.match(css, /\.landing-photo-row\s*\{[^}]*min-width:\s*0;[^}]*width:\s*100%;/s);
});

test('하단 지도 CTA는 발견 문구와 짧은 지도 동작을 분리한 편집형 링크다', async () => {
    const html = await readFile(new URL('index.html', root), 'utf8');
    const css = await readFile(new URL('style.css', root), 'utf8');
    const footer = html.match(/<button id="landing-map-footer"[\s\S]*?<\/button>/)?.[0] ?? '';
    assert.match(footer, /class="landing-map-footer page-container"[^>]*data-route="explore"/);
    assert.match(footer, /class="landing-map-footer-eyebrow"[\s\S]*?>지도 탐색<\/span>/);
    assert.match(footer, /id="landing-map-footer-title"[\s\S]*?지도를 따라,[\s\S]*?마음에 남을 장소를 발견해보세요\./);
    assert.match(footer, /class="landing-map-footer-action"[\s\S]*?>지도 열기<\/span>[\s\S]*?>arrow_forward<\/span>/);
    assert.match(css, /\.landing-map-footer\.page-container\s*\{[^}]*justify-items:\s*start;[^}]*overflow:\s*hidden;/s);
    assert.match(css, /\.landing-map-footer\.page-container::before\s*\{[^}]*url\(['"]?images\/landing-map-pins-background\.jpg['"]?\)[^}]*\/\s*cover\s+no-repeat;[^}]*opacity:\s*0\.92;[^}]*mask-image:\s*radial-gradient/s);
    assert.match(css, /\.landing-map-footer\.page-container::after\s*\{[^}]*linear-gradient\(90deg,/s);
    assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.landing-map-footer\.page-container\s*\{[^}]*place-items:\s*center;/s);
    assert.doesNotMatch(css.match(/\.landing-map-footer\.page-container\s*\{[^}]*\}/s)?.[0] ?? '', /border-radius:/);
    assert.match(css, /\.landing-map-footer\.page-container\s*\{[^}]*border:\s*0;[^}]*background:\s*transparent;[^}]*color:\s*#fff;[^}]*cursor:\s*pointer;/s);
    assert.doesNotMatch(css, /\.landing-map-footer \.btn-primary/);
    assert.match(css, /#landing-map-footer-title\s*\{[^}]*font-size:\s*clamp\(30px,\s*3\.4vw,\s*48px\);/s);
});

test('지도 CTA 시안 갤러리는 최종 디자인 적용 후 제거한다', async () => {
    const html = await readFile(new URL('index.html', root), 'utf8');
    const css = await readFile(new URL('style.css', root), 'utf8');
    assert.doesNotMatch(html, /landing-map-cta-gallery|landing-map-cta-demo/);
    assert.doesNotMatch(css, /\.landing-map-cta-gallery|\.landing-map-cta-demo/);
});

test('검색 영역의 지도 진입은 무거운 배경 버튼 대신 간결한 텍스트 동작이다', async () => {
    const html = await readFile(new URL('index.html', root), 'utf8');
    const css = await readFile(new URL('style.css', root), 'utf8');
    const primary = html.match(/<button id="landing-map-primary"[\s\S]*?<\/button>/)?.[0] ?? '';

    assert.match(primary, />지도로 둘러보기<\/span>/);
    assert.match(primary, />arrow_forward<\/span>/);
    assert.match(css, /\.landing-map-link\s*\{[^}]*border-radius:\s*0;[^}]*background:\s*transparent;[^}]*color:\s*var\(--teal\);/s);
});

test('로그인 모달은 선택 수단만 간결하게 보여준다', async () => {
    const html = await readFile(new URL('index.html', root), 'utf8');
    const authStart = html.indexOf('id="auth-modal"');
    const authEnd = html.indexOf('id="password-recovery-modal"', authStart);
    const auth = html.slice(authStart, authEnd);

    assert.match(auth, /id="auth-title"/);
    assert.match(auth, /id="btn-google-login"/);
    assert.match(auth, /id="btn-kakao-login"/);
    assert.match(auth, /id="btn-email-start"/);
    assert.doesNotMatch(auth, />Account</);
    assert.doesNotMatch(auth, /auth-intro/);
    assert.doesNotMatch(auth, /auth-policy-note/);
});

test('랜딩 소제목은 중앙에 놓이고 섹션 사이에는 충분한 여백을 둔다', async () => {
    const css = await readFile(new URL('style.css', root), 'utf8');
    assert.match(css, /\.landing-section-heading\s*\{[^}]*position:\s*relative;[^}]*display:\s*grid;[^}]*place-items:\s*center;/s);
    assert.match(css, /\.landing-section-heading\s*\{[^}]*margin-bottom:\s*36px;/s);
    assert.match(css, /\.landing-section-heading h2\s*\{[^}]*text-align:\s*center;/s);
    assert.match(css, /\.landing-scroll-actions\s*\{[^}]*position:\s*absolute;[^}]*right:\s*0;/s);
    assert.match(css, /\.landing-photo-row\s*\{[^}]*grid-auto-columns:\s*minmax\(210px,\s*25%\);/s);
    assert.match(css, /\.landing-sections\s*\{[^}]*gap:\s*128px;/s);
    assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.landing-photo-row\s*\{[^}]*gap:\s*12px;/s);
    assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.landing-section-heading\s*\{[^}]*margin-bottom:\s*24px;/s);
    assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.landing-sections\.page-container\s*\{[^}]*gap:\s*72px;[^}]*padding-top:\s*36px;[^}]*padding-bottom:\s*56px;/s);
});

test('모바일 사진 목록은 두 번째 사진을 중앙에 놓아 양옆 사진을 보여준다', async () => {
    const app = await readFile(new URL('js/app.js', root), 'utf8');
    const css = await readFile(new URL('style.css', root), 'utf8');
    assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.landing-photo-row\s*\{[^}]*display:\s*flex;[^}]*--landing-mobile-card-width:\s*calc\(\(100vw - 32px\) \* 0\.6\);[^}]*padding-left:\s*calc\(\(100% - var\(--landing-mobile-card-width\)\) \/ 2\);/s);
    assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*\.landing-photo-card\s*\{[^}]*flex:\s*0 0 var\(--landing-mobile-card-width\);[^}]*scroll-snap-align:\s*center;/s);
    assert.match(app, /function centerLandingRowsOnMobile\(\)/);
    assert.match(app, /window\.matchMedia\('\(max-width: 760px\)'\)\.matches/);
    assert.match(app, /const target = cards\[1\]/);
    assert.match(app, /row\.scrollLeft = target\.offsetLeft - \(row\.clientWidth - target\.clientWidth\) \/ 2/);
});

test('로그인 여부와 관계없이 기본 홈은 새 랜딩만 표시한다', async () => {
    const css = await readFile(new URL('style.css', root), 'utf8');
    assert.match(css, /\.page-home\s*>\s*\.home-workspace\s*\{[^}]*display:\s*none\s*!important;/s);
    assert.match(css, /body\.is-logged-in\[data-page="home"\]\s+\.page-home\s*>\s*\.landing-discovery,[\s\S]*body\.is-logged-in\[data-page="landing"\]\s+\.page-home\s*>\s*\.landing-discovery\s*\{[^}]*display:\s*block;/s);
    assert.doesNotMatch(css, /body\.is-logged-in\s+\.home-workspace\s*\{[^}]*display:\s*block;/s);
    assert.doesNotMatch(css, /body\.is-logged-in\[data-page="landing"\]\s+\.(?:home-workspace|home-houses-reference|home-feature-stories|white-band)[\s\S]*display:\s*(?:block|grid);/s);
});

test('랜딩은 상단·고정 하단 메뉴 대신 두 곳에서 지도 둘러보기를 제공한다', async () => {
    const html = await readFile(new URL('index.html', root), 'utf8');
    assert.doesNotMatch(html, /class="top-nav"/);
    assert.doesNotMatch(html, /class="mobile-bottom-nav"/);
    assert.match(html, /id="landing-map-primary"[^>]*data-route="explore"/);
    assert.match(html, /id="landing-map-footer"[^>]*data-route="explore"/);
});

test('헤더 사진 추가와 계정 메뉴는 승인된 세 가지 개인 메뉴만 노출한다', async () => {
    const html = await readFile(new URL('index.html', root), 'utf8');
    const accountMenuStart = html.indexOf('id="account-menu-popover"');
    const accountMenuEnd = html.indexOf('</div>', accountMenuStart);
    const accountMenu = html.slice(accountMenuStart, accountMenuEnd);
    assert.match(html, /id="btn-header-upload"[^>]*data-route="upload"/);
    assert.match(accountMenu, /내 프로필/);
    assert.match(accountMenu, /내 사진/);
    assert.match(accountMenu, /좋아요한 사진/);
    assert.doesNotMatch(accountMenu, /여행요약|여행 요약/);
});

test('내 사진 페이지 안에서 사진과 앨범을 전환한다', async () => {
    const html = await readFile(new URL('index.html', root), 'utf8');
    const pageStart = html.indexOf('id="page-photos"');
    const pageEnd = html.indexOf('id="page-liked"');
    const page = html.slice(pageStart, pageEnd);
    assert.match(page, /data-my-library-tab="photos"/);
    assert.match(page, /data-my-library-tab="albums"/);
    assert.match(page, /id="photos-album-list"/);
});

test('사진 상세는 정확 위치에서만 지연 로딩하는 거리뷰 영역을 제공한다', async () => {
    const html = await readFile(new URL('index.html', root), 'utf8');
    const app = await readFile(new URL('js/app.js', root), 'utf8');
    const css = await readFile(new URL('style.css', root), 'utf8');
    assert.match(html, /id="photo-detail-street-view"/);
    assert.match(html, /id="photo-detail-street-view-preview"/);
    assert.match(html, /id="photo-detail-street-view-static"/);
    assert.match(html, /id="btn-load-street-view"/);
    assert.match(html, /class="photo-detail-street-view__overlay"/);
    assert.doesNotMatch(html, /정확한 위치가 공개된 사진에서만 사용할 수 있습니다/);
    assert.doesNotMatch(app, /마우스를 올리거나 버튼에 초점을 맞춰 동적 거리뷰를 열 수 있습니다/);
    assert.match(app, /normalizeLocationPrecision\(photo\.location_precision\) === 'exact'/);
    assert.match(app, /getStreetViewStaticImageUrl/);
    assert.match(app, /renderPhotoDetailStreetViewPreview\(photo\)/);
    assert.match(app, /preview\.classList\.add\('is-fallback'\);[\s\S]*preview\.hidden = false;/s);
    assert.match(app, /new maps\.StreetViewService\(\)/);
    assert.match(app, /preference:\s*maps\.StreetViewPreference\.NEAREST/);
    assert.match(app, /new maps\.StreetViewPanorama\(canvas/);
    assert.match(app, /preview\.hidden = true/);
    assert.match(app, /section\.classList\.add\('is-unavailable'\)/);
    assert.match(app, /해당 위치에 거리뷰가 없습니다/);
    assert.match(css, /\.photo-detail-street-view__preview:hover \.photo-detail-street-view__overlay,[\s\S]*opacity:\s*1;/s);
    assert.match(css, /@media \(hover:\s*none\)[\s\S]*\.photo-detail-street-view__overlay\s*\{[^}]*opacity:\s*1;/s);
    assert.match(css, /\.photo-detail-street-view\.is-unavailable #photo-detail-street-view-message\s*\{[^}]*opacity:\s*0\.62;/s);
});

test('랜딩 관리자 저장소는 app_metadata 관리자만 변경할 수 있다', async () => {
    const migration = await readFile(new URL('supabase/migrations/20260826090519_add_landing_curation.sql', root), 'utf8');
    assert.match(migration, /create table if not exists public\.landing_sections/i);
    assert.match(migration, /create table if not exists public\.landing_section_photos/i);
    assert.match(migration, /enable row level security/i);
    assert.match(migration, /auth\.jwt\(\) -> 'app_metadata' ->> 'role'/);
    assert.doesNotMatch(migration, /user_metadata/);
    assert.match(migration, /revoke all on table public\.landing_sections from anon, authenticated/i);
});

test('관리자 판별은 수정 가능한 app_metadata만 사용한다', () => {
    assert.equal(isLandingAdmin({ app_metadata: { role: 'admin' } }), true);
    assert.equal(isLandingAdmin({ user_metadata: { role: 'admin' } }), false);
});

test('랜딩 섹션과 검색, 추가 로딩 규칙을 정규화한다', () => {
    const sections = normalizeLandingSections([
        { id: 2, title: '도시', sort_order: 2, is_visible: true },
        { id: 1, title: '바다', sort_order: 1, is_visible: true },
        { id: 3, title: '숨김', sort_order: 0, is_visible: false }
    ], [
        { section_id: 1, photo_id: 'b', sort_order: 2 },
        { section_id: 1, photo_id: 'a', sort_order: 1 }
    ]);
    assert.deepEqual(sections.map((section) => section.title), ['바다', '도시']);
    assert.deepEqual(sections[0].photo_ids, ['a', 'b']);

    const photos = [
        { id: 'a', visibility: 'public', description: '제주 바다' },
        { id: 'b', visibility: 'private', description: '제주 바다' },
        { id: 'c', shared: true, placeName: '서울 야경' }
    ];
    assert.deepEqual(getLandingSearchResults(photos, '제주').map(({ id }) => id), ['a']);
    assert.equal(getLandingVisiblePhotos(Array.from({ length: 30 }), 20).length, 20);
});

test('랜딩 검색은 동의어와 AI 분석 메타데이터를 관련도 순으로 혼합한다', () => {
    const photos = [
        { id: 'exact', visibility: 'public', tags: ['길'], placeName: '서울' },
        { id: 'synonym', visibility: 'public', ai_tags: ['도로'], placeName: '서울' },
        { id: 'scene', visibility: 'public', ai_scene: 'road', placeName: '제주' },
        { id: 'mood', visibility: 'public', ai_summary: '나무 사이의 조용한 산책', ai_moods: ['평온'] },
        { id: 'private', visibility: 'private', tags: ['길'], placeName: '서울' }
    ];

    assert.deepEqual(getLandingSearchResults(photos, '길').map(({ id }) => id), ['exact', 'synonym', 'scene']);
    assert.deepEqual(getLandingSearchResults(photos, '도로').map(({ id }) => id), ['synonym', 'scene', 'exact']);
    assert.deepEqual(getLandingSearchResults(photos, '서울 길').map(({ id }) => id), ['exact', 'synonym']);
    assert.deepEqual(getLandingSearchResults(photos, '한적한').map(({ id }) => id), ['mood']);
});
