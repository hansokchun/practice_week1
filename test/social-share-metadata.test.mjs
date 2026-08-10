import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('the app shell exposes a Kakao-friendly social preview', () => {
    const html = readFileSync('index.html', 'utf8');

    assert.match(html, /<link rel="canonical" href="https:\/\/practice-week1-cws\.pages\.dev\/">/);
    assert.match(html, /<meta property="og:type" content="website">/);
    assert.match(html, /<meta property="og:title" content="Ikkyee \| Personal Travel Map Archive">/);
    assert.match(html, /<meta property="og:description" content="[^"]+">/);
    assert.match(html, /<meta property="og:url" content="https:\/\/practice-week1-cws\.pages\.dev\/">/);
    assert.match(html, /<meta property="og:image" content="https:\/\/practice-week1-cws\.pages\.dev\/social-preview\.jpg">/);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
});
