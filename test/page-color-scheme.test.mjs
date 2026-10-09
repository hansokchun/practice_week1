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

test('the decorative globe follows the rendered canvas without blending photo cards or controls', async () => {
    const css = await readFile(new URL('style.css', root), 'utf8');
    const html = await readFile(new URL('index.html', root), 'utf8');
    const canvas = css.match(/\.landing-discovery\s*\{([^}]*)\}/)?.[1] ?? '';
    const globe = css.match(/^\.landing-search-globe\s*\{([^}]*)\}/m)?.[1] ?? '';

    assert.match(canvas, /isolation:\s*isolate;/);
    assert.match(canvas, /background:\s*var\(--bg\);/);
    assert.match(globe, /mix-blend-mode:\s*multiply;/);
    assert.match(globe, /z-index:\s*0;/);
    assert.match(globe, /filter:\s*none;/);
    assert.match(css, /\.landing-discovery\s*>\s*:not\(\.landing-search-globe\)\s*\{[^}]*z-index:\s*1;/s);
    assert.match(html, /<img\s+class="landing-search-globe"[^>]*aria-hidden="true"/);
});
