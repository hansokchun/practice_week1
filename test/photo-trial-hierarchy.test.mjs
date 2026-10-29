import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync('style.css', 'utf8');

test('trial introduction separates the current step from quieter upcoming stages', () => {
    assert.match(css, /\.photo-trial-intro\s*\{[^}]*border: 0;[^}]*background: transparent;/s);
    assert.match(css, /\.photo-trial-steps li\s*\{[^}]*background: transparent;[^}]*box-shadow: none;/s);
    assert.match(css, /\.photo-trial-steps li\[aria-current="step"\]\s*\{[^}]*background: var\(--action-soft\)/s);
    assert.match(css, /\.photo-trial-steps li:not\(\[aria-current\]\) strong\s*\{[^}]*color: var\(--muted\)/s);
});

test('the first picker has a warm accent, not another teal or nested card', () => {
    const empty = '.photo-trial-card:has([data-trial-workspace][hidden])';
    assert.ok(css.includes(`${empty} [data-trial-add]`));
    assert.match(css, /\[data-trial-add\]\s*\{[^}]*background: color-mix\(in srgb, var\(--coral\) 34%, var\(--surface\)\);[^}]*color: var\(--teal-dark\)/s);
    assert.match(css, /\.photo-trial-picker\s*\{[^}]*border: 0;[^}]*background: transparent;[^}]*box-shadow: none;/s);
});
