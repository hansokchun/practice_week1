import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('style.css', 'utf8');

test('header actions use the selected pale-teal design without changing the shared primary buttons', () => {
    const header = css.match(/\.site-header \.nav-action\s*\{([^}]+)\}/s)?.[1] || '';
    assert.match(header, /background: var\(--action-soft\)/);
    assert.match(header, /color: var\(--teal\)/);
    assert.match(header, /box-shadow: none/);
    assert.match(css, /\.site-header #btn-open-auth\s*\{[^}]*background: var\(--surface\)/s);
    assert.match(css, /\.btn-primary\s*\{[^}]*background: var\(--teal\)/s);
    assert.match(css, /\.site-header :is\([^}]+:focus-visible\s*\{[^}]*outline: 2px solid var\(--teal\)/s);
    assert.match(css, /#btn-header-upload > span\.header-map-dot\s*\{\s*display: block;/);
    assert.match(css, /#btn-header-upload > span\.header-map-dot\[hidden\]/);
});
