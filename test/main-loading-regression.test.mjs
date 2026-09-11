import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldRefreshPhotoSignedUrl } from '../js/photo-signed-url-freshness.mjs';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const imageHelpers = source.slice(source.indexOf('function getPhotoImageSrc'), source.indexOf('function renderPhotoImage'));
const helpers = runInNewContext(`${imageHelpers}; ({ getPhotoImageSrc, getPhotoThumbnailSrc })`, { shouldRefreshPhotoSignedUrl, MAIN_BG_2_URL: '/sample.jpg' });

test('thumbnail cards do not request the original while the thumbnail URL is pending', () => {
    const photo = { storage_path: 'a/p.jpg', thumbnail_path: 'a/thumbnails/p.jpg', url: 'stored-stale' };
    assert.equal(helpers.getPhotoThumbnailSrc(photo), '');
    assert.equal(helpers.getPhotoImageSrc(photo), '');
    const hydrated = { ...photo, url: '/signed-original', thumbnail_url: '/signed-thumbnail', signed_url_expires_at: Date.now() + 900000 };
    assert.equal(helpers.getPhotoThumbnailSrc(hydrated), '/signed-thumbnail');
    assert.equal(helpers.getPhotoImageSrc(hydrated), '/signed-original');
    assert.equal(helpers.getPhotoThumbnailSrc({ ...hydrated, thumbnail_url: null }), '');
    assert.equal(helpers.getPhotoThumbnailSrc({ ...hydrated, thumbnail_url: null, thumbnail_path: null }), '/signed-original');
});

test('main failures and loading resolve before an empty gallery is presented', () => {
    const body = source.slice(source.indexOf('function renderLandingSections()'), source.indexOf('function centerLandingRowsOnMobile'));
    assert.ok(body.indexOf('state.savedPhotosLoadError') < body.indexOf('getLandingPublicPhotos()'));
    assert.match(body, /renderActionableFailure/);
    assert.match(body, /!state.hasLoadedSavedPhotos \|\| !state.hasLoadedLandingCuration/);
    assert.match(body, /if \(!query && !visiblePhotos.length\) return ''/);
    const hero = source.slice(source.indexOf('function renderLandingHeroSlides()'), source.indexOf('function getLandingPhotoLabel'));
    assert.match(hero, /if \(document.body.dataset.page !== LANDING_ROUTE\) return/);
});
