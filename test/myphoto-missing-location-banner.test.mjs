import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const source = readFileSync('js/app.js', 'utf8');

test('missing location banner has direct assign and dismiss actions only', () => {
    const bannerStart = html.indexOf('class="attention-banner"');
    const bannerEnd = html.indexOf('class="recent-photo-section"', bannerStart);
    const banner = html.slice(bannerStart, bannerEnd);

    assert.match(html, /<section class="attention-banner" hidden>/);
    assert.match(banner, /id="btn-direct-missing-location"/);
    assert.match(banner, /id="btn-dismiss-missing-location"/);
    assert.doesNotMatch(banner, /id="btn-edit-missing-location"/);
});

test('missing location banner only appears when there are unresolved missing-location photos', () => {
    const fnStart = source.indexOf('function renderSavedPhotoSurfaces');
    const fnEnd = source.indexOf('function renderPersonalPhotosPage', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /const attentionBanner = \$\('\.attention-banner'\)/);
    assert.match(body, /const shouldShowMissingLocationBanner = stats\.missingLocationCount > 0 && !state\.isMissingLocationBannerDismissed/);
    assert.match(body, /attentionBanner\.hidden = !shouldShowMissingLocationBanner/);
    assert.match(body, /if \(shouldShowMissingLocationBanner\) \{[\s\S]*attentionTitle\)\s+attentionTitle\.textContent/);
    assert.doesNotMatch(body, /else \{[\s\S]*attentionTitle\.textContent/);
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
