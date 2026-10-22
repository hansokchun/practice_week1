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
