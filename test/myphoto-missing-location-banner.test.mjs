import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const source = readFileSync('js/app.js', 'utf8');

test('missing location banner has direct assign and dismiss actions only', () => {
    const bannerStart = html.indexOf('class="attention-banner"');
    const bannerEnd = html.indexOf('class="recent-photo-section"', bannerStart);
    const banner = html.slice(bannerStart, bannerEnd);

    assert.match(banner, /id="btn-direct-missing-location"/);
    assert.match(banner, /id="btn-dismiss-missing-location"/);
    assert.doesNotMatch(banner, /수정/);
});

test('missing location banner is hidden when all photos have locations or it is dismissed', () => {
    const fnStart = source.indexOf('function renderSavedPhotoSurfaces');
    const fnEnd = source.indexOf('function renderPersonalPhotosPage', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /const attentionBanner = \$\('\.attention-banner'\)/);
    assert.match(body, /attentionBanner\.hidden = stats\.missingLocationCount === 0 \|\| state\.isMissingLocationBannerDismissed/);
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
