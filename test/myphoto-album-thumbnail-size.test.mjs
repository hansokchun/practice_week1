import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('myphoto album thumbnails use a compact Google Photos style row', () => {
    const css = readFileSync('style.css', 'utf8');

    assert.match(css, /\.album-list\s*\{[^}]*justify-items:\s*start;/s);
    assert.match(css, /\.album-row\s*\{[^}]*grid-template-columns:\s*minmax\(200px,\s*248px\)\s*minmax\(260px,\s*360px\);/s);
    assert.match(css, /\.album-row\s*\{[^}]*width:\s*min\(100%,\s*608px\);/s);
    assert.match(css, /\.album-row\s*\{[^}]*border-radius:\s*14px;/s);
    assert.match(css, /\.album-row img\s*\{[^}]*min-height:\s*248px;[^}]*aspect-ratio:\s*1;/s);
    assert.match(css, /\.album-status-badge,[\s\S]*\.album-row\s+\.status-line\s*\{[^}]*display:\s*inline-flex;[^}]*border-radius:\s*999px;/s);
    assert.match(css, /\.album-row:hover,\s*\.album-row:focus-visible\s*\{[^}]*transform:\s*translateY\(-3px\);/s);
});
