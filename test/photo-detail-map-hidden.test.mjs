import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('photo detail modal does not embed a second map surface', () => {
    const html = readFileSync('index.html', 'utf8');
    const source = readFileSync('js/app.js', 'utf8');
    const css = readFileSync('style.css', 'utf8');

    assert.equal(html.includes('photo-detail-map'), false);
    assert.equal(source.includes('photo-detail-map'), false);
    assert.equal(source.includes('photo-detail-map-frame'), false);
    assert.equal(css.includes('.photo-detail-map'), false);
    assert.match(html, /data-show-photo-on-map/);
});
