import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('myphoto album thumbnails are reduced to roughly two thirds of the previous size', () => {
    const css = readFileSync('style.css', 'utf8');

    assert.match(css, /\.album-row\s*\{[^}]*grid-template-columns:\s*minmax\(160px,\s*27%\)\s*1fr;/s);
    assert.match(css, /\.album-row img\s*\{[^}]*min-height:\s*174px;/s);
});
