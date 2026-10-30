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
    assert.match(app, /import contributionPhotoMapUrl from '\.\.\/images\/seoul-photo-map-v2\.webp';/);
    assert.match(invitation, /<div class="photo-contribution-art" aria-hidden="true">/);
    assert.match(invitation, /<img class="photo-contribution-map-image"[^>]*src="\$\{contributionPhotoMapUrl\}"[^>]*alt=""[^>]*width="1152"[^>]*height="768"[^>]*loading="lazy"[^>]*decoding="async"/);
    assert.doesNotMatch(invitation, /<svg class="photo-contribution-art"/);
});

test('the original map carries three contained real-photo overlays with an accessible source link', () => {
    const invitation = app.slice(app.indexOf('function renderLandingContributionInvitation()'), app.indexOf('function renderLandingSections()'));
    for (const [place, variable] of [
        ['bukchon', 'contributionBukchonPhotoUrl'],
        ['daeo', 'contributionDaeoPhotoUrl'],
        ['ihwa', 'contributionIhwaPhotoUrl']
    ]) {
        assert.ok(app.includes(`import ${variable} from '../images/contribution-${place}.webp?no-inline';`));
        assert.ok(invitation.includes(`class="photo-contribution-photo photo-contribution-photo--${place}" src="\${${variable}}" alt="" width="160" height="120" loading="lazy" decoding="async"`));
    }
    assert.equal((invitation.match(/class="photo-contribution-photo /g) || []).length, 3);
    assert.match(invitation, /<\/div>\s*<a class="photo-contribution-credits" href="\/artwork\/photo-credits\.html" aria-label="사진 출처" title="사진 출처">\s*<span class="material-symbols-outlined" aria-hidden="true">info<\/span>\s*<\/a>/);
    assert.doesNotMatch(invitation, /<svg class="photo-contribution-map|geolocation/);
});

test('the decorative Seoul map stays visible below the copy on mobile without replacing the upload action', () => {
    const contributionStyles = styles.slice(styles.indexOf('/* An editorial pause'), styles.indexOf('.landing-map-footer'));
    assert.match(contributionStyles, /\.photo-contribution--inline\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 480px\);[^}]*padding: 24px 48px/s);
    assert.match(contributionStyles, /\.photo-contribution-visual\s*\{[^}]*display: flex;[^}]*align-items: center;[^}]*justify-content: center;[^}]*height: 260px/s);
    assert.match(contributionStyles, /\.photo-contribution-art\s*\{[^}]*width: 390px;[^}]*max-width: 100%;[^}]*aspect-ratio: 3 \/ 2/s);
    assert.match(contributionStyles, /\.photo-contribution-map-image\s*\{[^}]*width: 100%;[^}]*height: 100%;[^}]*object-fit: contain/s);
    assert.match(contributionStyles, /@media \(max-width: 860px\)[\s\S]*?\.photo-contribution--inline\s*\{[^}]*minmax\(0, 280px\);[^}]*padding: 24px 32px/s);
    assert.match(contributionStyles, /@media \(max-width: 860px\)[\s\S]*?\.photo-contribution-visual\s*\{[^}]*height: 210px/s);
    assert.match(contributionStyles, /@media \(max-width: 860px\)[\s\S]*?\.photo-contribution-art\s*\{[^}]*width: 315px/s);
    assert.match(contributionStyles, /@media \(max-width: 600px\)[\s\S]*?\.photo-contribution--inline\s*\{[^}]*gap: 16px;[^}]*padding: 20px 24px/s);
    assert.match(contributionStyles, /@media \(max-width: 600px\)[\s\S]*?\.photo-contribution-visual\s*\{[^}]*height: 180px/s);
    assert.match(contributionStyles, /@media \(max-width: 600px\)[\s\S]*?\.photo-contribution-art\s*\{[^}]*width: 270px/s);
    assert.doesNotMatch(contributionStyles, /\.photo-contribution-art\s*\{[^}]*display: none/s);
    assert.match(contributionStyles, /\.photo-contribution--inline \.photo-contribution-description\s*\{[^}]*color: color-mix\(in srgb, var\(--muted\) 85%, var\(--text\)\)/s);
    assert.match(app, /<button class="btn-primary photo-contribution-cta" data-contribution-upload data-brand-motion type="button"/);
});

test('photo frames scale from the unchanged map coordinates without cropping their photographs', () => {
    const contributionStyles = styles.slice(styles.indexOf('/* An editorial pause'), styles.indexOf('.landing-map-footer'));
    assert.match(contributionStyles, /\.photo-contribution-photo\s*\{[^}]*position: absolute;[^}]*padding: calc\(100% \* 3 \/ 1152\);[^}]*background: var\(--photo-contribution-frame\);[^}]*object-fit: contain/s);
    for (const [place, x, y, width, height] of [
        ['bukchon', 236, 143, 160, 125],
        ['daeo', 854, 170, 137, 119],
        ['ihwa', 639, 351, 166, 134]
    ]) {
        const rule = contributionStyles.match(new RegExp(`\\.photo-contribution-photo--${place}\\s*\\{([^}]*)\\}`))?.[1];
        assert.ok(rule, `${place} must have a map-relative frame`);
        assert.ok(rule.includes(`left: calc(${x} / 1152 * 100%);`));
        assert.ok(rule.includes(`top: calc(${y} / 768 * 100%);`));
        assert.ok(rule.includes(`width: calc(${width} / 1152 * 100%);`));
        assert.ok(rule.includes(`height: calc(${height} / 768 * 100%);`));
    }
    assert.match(contributionStyles, /\.photo-contribution-credits\s*\{[^}]*position: absolute;[^}]*right: 0;[^}]*bottom: 0;[^}]*min-width: 44px;[^}]*min-height: 44px/s);
    assert.match(contributionStyles, /\.photo-contribution-credits \.material-symbols-outlined\s*\{[^}]*font-size: 18px/s);
    assert.match(styles, /\.photo-contribution-credits:focus-visible\s*\{[^}]*outline: 2px solid var\(--teal\);[^}]*outline-offset: 4px/s);
    assert.match(styles, /\.photo-contribution-credits:hover\s*\{[^}]*background: var\(--surface-soft\);[^}]*color: var\(--teal\)/s);
    assert.match(styles, /\.photo-contribution-credits:active\s*\{[^}]*background: var\(--surface-muted\);[^}]*color: var\(--teal-dark\)/s);
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
