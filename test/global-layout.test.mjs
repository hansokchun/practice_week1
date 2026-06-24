import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync('style.css', 'utf8');

test('global layout reserves scrollbar space so fixed header alignment stays stable between routes', () => {
    assert.match(css, /html\s*\{[^}]*scrollbar-gutter:\s*stable;/s);
    assert.match(css, /@supports\s+not\s+\(scrollbar-gutter:\s*stable\)\s*\{[\s\S]*html\s*\{[^}]*overflow-y:\s*scroll;/s);
});
