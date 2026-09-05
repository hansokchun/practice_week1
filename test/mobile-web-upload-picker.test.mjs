import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const app = readFileSync('js/app.js', 'utf8');

test('mobile web photo inputs request the system image picker without forcing the camera', () => {
    const inputs = `${html}\n${app}`.match(/<input id="photo-input"[^>]+>/gu) || [];
    assert.equal(inputs.length, 3);
    inputs.forEach((input) => {
        assert.match(input, /accept="image\/\*"/u);
        assert.doesNotMatch(input, /\bcapture\b/u);
    });
});

test('successful mobile selection activates upload before rendering its review controls', () => {
    const start = app.indexOf('function handlePhotoFiles');
    const end = app.indexOf('function bindPhotoInput', start);
    const body = app.slice(start, end);
    assert.ok(body.indexOf("routeTo('upload')") < body.indexOf('renderStagedPhotos()'));
});
