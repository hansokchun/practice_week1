import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPhotoAccessibleLabel } from '../js/photo-accessible-label.mjs';

test('photo labels skip empty captions and distinguish unnamed photos without showing IDs', () => {
    assert.equal(getPhotoAccessibleLabel({ placeName: ' ', title: '서울 골목' }, 0), '서울 골목 · 1번째 사진');
    assert.equal(getPhotoAccessibleLabel({}, 1), '여행 사진 · 2번째 사진');
    assert.equal(getPhotoAccessibleLabel({}, 2), '여행 사진 · 3번째 사진');
    assert.equal(getPhotoAccessibleLabel({ description: '카페' }), '카페');
});

test('landing card label and photo-background descriptor use accessible styling', () => {
    const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
    assert.match(app, /function renderLandingPhotoCard\(photo, index\)/);
    assert.match(app, /getPhotoAccessibleLabel\(photo, index\)/);
    assert.match(css, /body\[data-page="landing"\] \.brand-korean\s*\{[^}]*color:\s*#fff/);
});
