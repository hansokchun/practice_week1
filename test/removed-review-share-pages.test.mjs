import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const app = readFileSync('js/app.js', 'utf8');
const shareCompletion = readFileSync('js/share-completion.mjs', 'utf8');

test('removed review and share pages are not rendered in the HTML shell', () => {
    assert.doesNotMatch(html, /id="page-review"/);
    assert.doesNotMatch(html, /id="page-share"/);
    assert.doesNotMatch(html, /id="review-day-list"/);
    assert.doesNotMatch(html, /id="share-photo-grid"/);
});

test('removed share page is not used as a completion route', () => {
    assert.doesNotMatch(shareCompletion, /#\/share/);
    assert.doesNotMatch(app, /completionHash !== '#\/share'/);
    assert.match(app, /renderRoute\(parseRouteHash\(completionHash\)\)/);
});
