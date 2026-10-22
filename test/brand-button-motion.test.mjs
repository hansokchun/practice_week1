import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { build } from 'vite';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

test('production CSS preserves nonzero durations for every part of the drawn logo', async () => {
    // The source was correct while the production minifier collapsed the nameless
    // animation shorthand to `none`. Exercise the actual Vite production pipeline.
    const result = await build({ logLevel: 'silent', build: { write: false } });
    const outputs = (Array.isArray(result) ? result : [result]).flatMap(item => item.output);
    const compiled = outputs.filter(item => item.type === 'asset' && item.fileName.endsWith('.css'))
        .map(item => String(item.source)).join('\n');
    const rules = Array.from(compiled.matchAll(/([^{}]+)\{([^{}]*)\}/g));
    for (const [part, duration] of [
        ['landing-mark-trail circle', /(?:\.28s|280ms)/],
        ['landing-mark-pin', /(?:\.6s|600ms)/],
        ['landing-mark-leaf', /(?:\.65s|650ms)/],
        ['landing-mark-vein', /(?:\.45s|450ms)/]
    ]) {
        assert.ok(rules.some(([, selector, declarations]) => selector.includes(part)
            && /animation(?:-duration)?:/.test(declarations) && duration.test(declarations)),
        `${part} must keep its animation duration after production minification`);
    }
});

test('landing and contribution actions share the drawn mark without changing their routes', () => {
    assert.match(html, /<button[^>]*data-landing-enter[^>]*data-route="home"[^>]*data-brand-motion/);
    const invitation = app.slice(app.indexOf('function renderLandingContributionInvitation()'), app.indexOf('function renderLandingSections()'));
    assert.match(invitation, /<button[^>]*data-contribution-upload[^>]*data-brand-motion/);
    assert.match(invitation, /class="landing-hero-enter-logo"[^>]*aria-hidden="true"[^>]*focusable="false"/);
    for (const part of ['landing-mark-trail', 'landing-mark-pin', 'landing-mark-leaf', 'landing-mark-vein']) {
        assert.ok(invitation.includes(part));
    }
    assert.match(invitation, /photo-contribution-art[^>]*aria-hidden="true"/);
    assert.match(app, /closest\('\[data-contribution-upload\]'\)[\s\S]*?routeTo\('upload'\)/);
});

test('shared logo motion is opt-in and respects pointer and reduced-motion preferences', () => {
    assert.match(css, /@media \(prefers-reduced-motion: no-preference\)/);
    assert.match(css, /\[data-brand-motion\]:focus-visible \.landing-mark-pin/);
    assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)/);
    assert.match(css, /\[data-brand-motion\]:hover \.landing-mark-pin/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\[data-brand-motion\] \.landing-hero-enter-logo \*/);
});

test('the contribution CTA keeps its touch target and quiet treatment over generic button styles', () => {
    // Generic .btn-primary declarations appear later in this stylesheet.
    const rule = css.match(/\.photo-contribution--inline \.photo-contribution-cta\s*\{([^}]+)\}/)?.[1];
    assert.ok(rule, 'scope the CTA above the later generic button specificity');
    assert.match(rule, /min-height: 54px/);
    assert.match(rule, /border-radius: var\(--thumbnail-radius\)/);
    assert.match(rule, /font-weight: 600/);
    assert.match(rule, /box-shadow: none/);
});
