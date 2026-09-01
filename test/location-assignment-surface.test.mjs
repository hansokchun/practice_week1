import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

test('upload completion page links missing photos to the dedicated location workflow', () => {
    assert.match(html, /id="page-upload-complete"/);
    assert.match(html, /id="btn-complete-location-assign"/);
    assert.match(app, /function renderUploadCompletePage\(\)/);
    assert.match(app, /routeTo\('location-assign'\)/);
});

test('manual location page exposes queue, selected photo, search map, and save action', () => {
    const start = html.indexOf('id="page-location-assign"');
    const end = html.indexOf('id="page-album"', start);
    const surface = html.slice(start, end);

    assert.match(surface, /id="location-assignment-thumbnails"/);
    assert.match(surface, /id="location-assignment-image"/);
    assert.match(surface, /id="location-assignment-search-input"/);
    assert.match(surface, /id="location-assignment-map"/);
    assert.match(surface, /id="btn-save-location-assignment"/);
    assert.match(surface, /id="location-assignment-nearby-list"/);
});

test('missing-location banner routes to the dedicated page instead of the photo edit modal', () => {
    assert.match(html, /id="btn-direct-missing-location"[^>]+data-route="location-assign"/);
    assert.match(app, /data-location-assignment-photo/);
});

test('location assignment uses a responsive split workspace and mobile horizontal queues', () => {
    assert.match(styles, /\.location-assignment-editor\s*\{[^}]*grid-template-columns:/s);
    assert.match(styles, /@media \(max-width: 720px\)[\s\S]*\.location-assignment-thumbnails\s*\{[^}]*display:\s*flex;[^}]*overflow-x:\s*auto;/s);
});
