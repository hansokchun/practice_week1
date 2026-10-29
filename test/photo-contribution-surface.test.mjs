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
    assert.match(app, /import contributionPhotoMapUrl from '\.\.\/images\/seoul-photo-map-v1\.webp';/);
    assert.match(invitation, /<img class="photo-contribution-art"[^>]*aria-hidden="true"[^>]*src="\$\{contributionPhotoMapUrl\}"[^>]*alt=""[^>]*width="1152"[^>]*height="768"[^>]*loading="lazy"[^>]*decoding="async"/);
    assert.doesNotMatch(invitation, /<svg class="photo-contribution-art"/);
});

test('the decorative Seoul map stays visible below the copy on mobile without replacing the upload action', () => {
    const contributionStyles = styles.slice(styles.indexOf('/* An editorial pause'), styles.indexOf('.landing-map-footer'));
    assert.match(contributionStyles, /\.photo-contribution--inline\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 480px\)/s);
    assert.match(contributionStyles, /\.photo-contribution-art\s*\{[^}]*width: 100%;[^}]*height: 320px;[^}]*object-fit: contain/s);
    assert.match(contributionStyles, /@media \(max-width: 600px\)[\s\S]*?\.photo-contribution-art\s*\{[^}]*display: block;[^}]*height: 220px/s);
    assert.doesNotMatch(contributionStyles, /\.photo-contribution-art\s*\{[^}]*display: none/s);
    assert.match(contributionStyles, /\.photo-contribution--inline \.photo-contribution-description\s*\{[^}]*color: color-mix\(in srgb, var\(--muted\) 85%, var\(--text\)\)/s);
    assert.match(app, /<button class="btn-primary photo-contribution-cta" data-contribution-upload data-brand-motion type="button"/);
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
