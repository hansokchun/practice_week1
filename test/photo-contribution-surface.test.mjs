import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

test('first-photo invitation starts hidden and uses the guarded upload route', () => {
    const invitation = html.slice(html.indexOf('id="home-first-photo-invitation"'), html.indexOf('id="landing-sections"'));
    assert.match(invitation, /hidden/);
    assert.match(invitation, /data-route="upload"/);
    assert.match(invitation, /id="btn-dismiss-first-photo-invitation"[^>]*aria-label=/);
    const renderer = app.slice(app.indexOf('function renderFirstPhotoInvitation()'), app.indexOf('function renderLandingContributionInvitation()'));
    assert.match(renderer, /photoCount: getMySavedPhotos\(\)\.length/);
    assert.match(renderer, /hasLoadedPhotos: state\.hasLoadedSavedPhotos/);
    assert.match(renderer, /loadError: state\.savedPhotosLoadError/);
    assert.match(app, /function renderSavedPhotoSurfaces\(\)\s*\{\s*renderFirstPhotoInvitation\(\)/);
});

test('the dynamic upload invitation has its own delegated route action', () => {
    assert.match(app, /data-contribution-upload/);
    assert.match(app, /closest\('\[data-contribution-upload\]'\)[\s\S]*?routeTo\('upload'\)/);
    const renderer = app.slice(app.indexOf('function renderLandingSections()'), app.indexOf('function centerLandingRowsOnMobile()'));
    assert.ok(renderer.indexOf('renderLandingSearchResults(container)') < renderer.indexOf('getContributionInsertIndex('));
    assert.match(renderer, /\.filter\(Boolean\)/);
    assert.match(renderer, /splice\(contributionIndex, 0, renderLandingContributionInvitation\(\)\)/);
});

test('the inline invitation leads with its title and a concise sharing subtitle', () => {
    const invitation = app.slice(app.indexOf('function renderLandingContributionInvitation()'), app.indexOf('function renderLandingSections()'));
    assert.match(invitation, /<h2 id="landing-contribution-title">당신의 장소도 들려주세요<\/h2>\s*<p class="photo-contribution-description">사진 한 장으로, 나만의 장소를 공유해요\.<\/p>/);
    assert.doesNotMatch(invitation, /photo-contribution-eyebrow|사진 한 장, 나만의 장소 기록|좋아하는 풍경부터 익숙한 골목까지/);
    assert.match(app, /import contributionPhotoMapUrl from '\.\.\/images\/seoul-photo-map-v3\.svg';/);
    assert.match(app, /import contributionNamsanUrl from '\.\.\/images\/seoul-namsan-sprite-v1\.webp';/);
    for (const place of ['Daeo', 'Bukchon', 'Ihwa']) {
        assert.match(app, new RegExp(`import contribution${place}Url from '\\.\\.\\/images\\/contribution-${place.toLowerCase()}\\.webp';`));
    }
    assert.match(invitation, /renderContributionArtwork\(\{\s*mapUrl: contributionPhotoMapUrl,\s*namsanUrl: contributionNamsanUrl,/);
    assert.doesNotMatch(invitation, /seoul-photo-map-v2|<img class="photo-contribution-art"/);
});

test('the decorative Seoul map stays visible below the copy on mobile without replacing the upload action', () => {
    const contributionStyles = styles.slice(styles.indexOf('/* An editorial pause'), styles.indexOf('.landing-map-footer'));
    assert.match(contributionStyles, /\.photo-contribution--inline\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 480px\)/s);
    assert.match(contributionStyles, /\.photo-contribution-art\s*\{[^}]*width: 100%;[^}]*height: 320px/s);
    assert.match(contributionStyles, /\.photo-contribution-art-stage\s*\{[^}]*max-width: 100%;[^}]*aspect-ratio: 3 \/ 2/s);
    assert.match(contributionStyles, /@media \(max-width: 600px\)[\s\S]*?\.photo-contribution-art\s*\{[^}]*display: flex;[^}]*height: 220px/s);
    assert.doesNotMatch(contributionStyles, /\.photo-contribution-art\s*\{[^}]*display: none/s);
    assert.match(contributionStyles, /\.photo-contribution--inline \.photo-contribution-description\s*\{[^}]*color: color-mix\(in srgb, var\(--muted\) 85%, var\(--text\)\)/s);
    assert.match(app, /<button class="btn-primary photo-contribution-cta" data-contribution-upload data-brand-motion type="button"/);
});

test('map and photo credits stay visible and linked outside the decorative composite', () => {
    const invitation = app.slice(app.indexOf('function renderLandingContributionInvitation()'), app.indexOf('function renderLandingSections()'));
    assert.match(invitation, /<p class="photo-contribution-attribution">/);
    assert.match(invitation, /href="https:\/\/www\.openstreetmap\.org\/copyright"[^>]*>지도 © OpenStreetMap<\/a>/);
    assert.match(invitation, /href="\/artwork\/credits\.html">사진 출처<\/a>/);
    assert.doesNotMatch(invitation, /photo-contribution-visual[^>]*aria-hidden|photo-contribution-attribution[^>]*aria-hidden/);
    assert.match(styles, /\.photo-contribution--inline \.photo-contribution-attribution\s*\{[^}]*color: color-mix\(in srgb, var\(--muted\) 85%, var\(--text\)\);[^}]*font-size: 14px/s);
    assert.match(styles, /\.photo-contribution-attribution a\s*\{[^}]*display: inline-flex;[^}]*min-height: 44px/s);
});

test('upload completion uses real upload guidance and routes the map to its owner', () => {
    assert.match(html, /id="btn-complete-map"[^>]*hidden/);
    assert.match(app, /getUploadCompletionGuidance\(uploadedPhotos, getMySavedPhotos\(\)\.length\)/);
    assert.match(app, /mapAction\.hidden = !guidance\.hasLocatedPhotos/);
    assert.match(app, /btn-complete-map[\s\S]*?routeToProfileFromAuthor\(null, state\.currentUser\.id\)/);
});

test('contribution invitations reflow and keep hidden and keyboard states accessible', () => {
    assert.match(styles, /\.home-first-photo-invitation\[hidden\]\s*\{\s*display: none/);
    assert.match(styles, /\.photo-contribution[^}]*\{[^}]*min-width: 0/s);
    assert.match(styles, /\.photo-contribution[^}]*h2[^}]*\{[^}]*word-break: keep-all/s);
    assert.match(styles, /\.photo-contribution-dismiss[^}]*\{[^}]*min-height: 44px/s);
    assert.match(styles, /@media \(max-width: 860px\)[\s\S]*\.photo-contribution\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
});
