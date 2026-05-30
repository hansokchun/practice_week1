import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('photo detail modal shows only the photo visibility status block', () => {
    const html = readFileSync('index.html', 'utf8');

    assert.equal(html.includes('<dt>Album</dt>'), false);
    assert.equal(html.includes('<dt>Visibility</dt>'), false);
    assert.equal(html.includes('<dt>Original</dt>'), false);
    assert.match(html, /id="photo-detail-visibility"/);
});

test('photo detail renderer writes only public or private visibility text', () => {
    const source = readFileSync('js/app.js', 'utf8');

    assert.equal(source.includes('albumValue'), false);
    assert.equal(source.includes('originalValue'), false);
    assert.match(source, /photo-detail-visibility/);
    assert.match(source, /공개/);
    assert.match(source, /비공개/);
});
