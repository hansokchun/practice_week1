import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const source = readFileSync('js/app.js', 'utf8');
const css = readFileSync('style.css', 'utf8');

test('missing location banner has direct assign and dismiss actions only', () => {
    const photosPageStart = html.indexOf('id="page-photos"');
    const photosPageEnd = html.indexOf('id="page-liked"', photosPageStart);
    const photosPage = html.slice(photosPageStart, photosPageEnd);
    const homeStart = html.indexOf('class="home-workspace');
    const homeEnd = html.indexOf('id="page-photos"', homeStart);
    const home = html.slice(homeStart, homeEnd);
    const bannerStart = photosPage.indexOf('class="attention-banner"');
    const bannerEnd = photosPage.indexOf('class="dashboard-panel full-panel"', bannerStart);
    const banner = photosPage.slice(bannerStart, bannerEnd);

    assert.doesNotMatch(home, /class="attention-banner"/);
    assert.ok(bannerStart > -1);
    assert.match(html, /<section class="attention-banner" hidden>/);
    assert.match(css, /\.attention-banner\[hidden\]\s*\{\s*display:\s*none;\s*\}/);
    assert.match(banner, /id="btn-direct-missing-location"/);
    assert.match(banner, /id="btn-dismiss-missing-location"/);
    assert.doesNotMatch(banner, /id="btn-edit-missing-location"/);
    assert.doesNotMatch(banner, /12/);
});

test('missing location banner only appears when there are unresolved missing-location photos', () => {
    const fnStart = source.indexOf('function renderSavedPhotoSurfaces');
    const fnEnd = source.indexOf('function renderPersonalPhotosPage', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /const attentionBanner = \$\('\.attention-banner'\)/);
    assert.match(body, /const shouldShowMissingLocationBanner = stats\.missingLocationCount > 0 && !state\.isMissingLocationBannerDismissed/);
    assert.match(body, /attentionBanner\.hidden = !shouldShowMissingLocationBanner/);
    assert.match(body, /if \(shouldShowMissingLocationBanner\) \{[\s\S]*attentionTitle\)\s+attentionTitle\.textContent/);
    assert.doesNotMatch(body, /attentionCopy/);
    assert.doesNotMatch(body, /메타데이터가 부족해/);
    assert.doesNotMatch(body, /else \{[\s\S]*attentionTitle\.textContent/);
});

test('missing location banner uses a full-size alert treatment without helper copy', () => {
    const photosPageStart = html.indexOf('id="page-photos"');
    const photosPageEnd = html.indexOf('id="page-liked"', photosPageStart);
    const photosPage = html.slice(photosPageStart, photosPageEnd);
    const bannerStart = photosPage.indexOf('class="attention-banner"');
    const bannerEnd = photosPage.indexOf('class="dashboard-panel full-panel"', bannerStart);
    const banner = photosPage.slice(bannerStart, bannerEnd);

    assert.doesNotMatch(banner, /<p>/);
    assert.match(css, /\.attention-banner\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*none;[^}]*margin:\s*0 0 24px;[^}]*border-left:\s*6px solid #99452f;[^}]*border-radius:\s*16px;[^}]*padding:\s*16px 18px;/s);
    assert.match(css, /\.attention-banner::before\s*\{[^}]*content:\s*"처리필요";[^}]*background:\s*#99452f;/s);
    assert.match(css, /\.attention-banner > span\s*\{[^}]*width:\s*40px;[^}]*height:\s*40px;/s);
    assert.match(css, /\.attention-banner strong\s*\{[^}]*font-size:\s*16px;/s);
});

test('missing location task list renders thumbnails without photo names', () => {
    const fnStart = source.indexOf('function renderMissingLocationTasks');
    const fnEnd = source.indexOf('function renderSavedAlbumRows', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /<img src="\$\{photo\.url\}"/);
    assert.doesNotMatch(body, /<strong>\$\{escapeHtml\(photo\.name\)\}<\/strong>/);
    assert.doesNotMatch(body, /<small>/);
});

test('missing location dismiss button only hides the alert', () => {
    assert.match(source, /#btn-dismiss-missing-location/);
    assert.match(source, /state\.isMissingLocationBannerDismissed = true/);
    assert.match(source, /renderSavedPhotoSurfaces\(\)/);
});
