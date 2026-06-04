import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('js/app.js', 'utf8');

test('selected personal photo deletion asks for confirmation with the selected count', () => {
    const fnStart = source.indexOf('async function deleteSelectedPersonalPhotos()');
    const fnEnd = source.indexOf('function renderMissingLocationTasks', fnStart);
    const body = source.slice(fnStart, fnEnd);

    assert.match(body, /window\.confirm/);
    assert.match(body, /selectedPhotos\.length/);
    assert.match(body, /정말 삭제/);
});
