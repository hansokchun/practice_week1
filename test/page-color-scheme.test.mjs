import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('the page declares its light-only palette before any stylesheet loads', async () => {
    const html = await readFile(new URL('index.html', root), 'utf8');
    const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? '';
    const scheme = head.match(/<meta\s+name="color-scheme"\s+content="only light"\s*\/?\s*>/);

    assert.ok(scheme, 'Declare the light-only palette before the first paint');
    assert.ok(scheme.index < head.indexOf('rel="stylesheet"'));
    assert.equal((head.match(/name="color-scheme"/g) ?? []).length, 1);
});

test('the root opts out of automatic dark recoloring while home keeps the shared canvas', async () => {
    const css = await readFile(new URL('style.css', root), 'utf8');
    const rootRule = css.match(/:root\s*\{([^}]*)\}/)?.[1] ?? '';

    assert.match(rootRule, /color-scheme:\s*only light;/);
    assert.match(rootRule, /--bg:\s*#f9f7f2;/);
    assert.match(css, /body\s*\{[^}]*background:\s*var\(--bg\);/s);
    assert.match(css, /\.landing-discovery\s*\{[^}]*background:\s*var\(--bg\);/s);
});
