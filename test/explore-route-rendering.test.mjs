import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const appSource = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

test('Explore route renders public surfaces after navigation', () => {
    assert.match(
        appSource,
        /normalized === APP_SECTIONS\.EXPLORE \|\| normalized === 'trip' \|\| normalized === 'profile'\) renderPublicSurfaces\(\);/
    );
});

test('initial app boot does not render Explore before applying the current route', () => {
    const bootStart = appSource.indexOf("document.addEventListener('DOMContentLoaded'");
    const bootBody = appSource.slice(bootStart);

    assert.doesNotMatch(bootBody, /renderExploreList\(\);/);
});

test('Explore map markers render only while the Explore page is active', () => {
    const renderStart = appSource.indexOf('function renderPublicSurfaces()');
    const renderEnd = appSource.indexOf('const relatedGrid =', renderStart);
    const body = appSource.slice(renderStart, renderEnd);

    assert.match(body, /document\.body\.dataset\.page === APP_SECTIONS\.EXPLORE/);
    assert.match(body, /if \(isExplorePage\) renderExploreMapMarkers\(locatedPhotos, selected\.id\);/);
});
