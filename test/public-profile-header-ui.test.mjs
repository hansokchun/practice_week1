import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('style.css', 'utf8');
const app = readFileSync('js/app.js', 'utf8');

test('public profile header does not render the numeric stats block', () => {
    assert.doesNotMatch(html, /profile-stats/);
    assert.doesNotMatch(app, /profile-stats/);
});

test('public profile card stays inside the cover without negative overlap', () => {
    const cardStart = css.indexOf('.profile-card {');
    const cardEnd = css.indexOf('.large-avatar', cardStart);
    const cardCss = css.slice(cardStart, cardEnd);

    assert.match(cardCss, /grid-template-columns:\s*auto minmax\(0, 1fr\)/);
    assert.match(cardCss, /margin:\s*0 auto;/);
    assert.doesNotMatch(cardCss, /-\d+px/);
});
