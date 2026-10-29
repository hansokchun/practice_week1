import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

test('trial step numbers, icons and connectors share one measured row geometry', () => {
    assert.match(css, /\.photo-trial-steps\s*\{[^}]*--trial-step-number-size: 28px;[^}]*--trial-step-icon-size: 36px;/s);
    assert.match(css, /\.photo-trial-steps li\s*\{[^}]*align-items: center;[^}]*padding: var\(--trial-step-padding-y\) var\(--trial-step-padding-x\);/s);
    assert.doesNotMatch(css, /\.photo-trial-steps::before\s*\{/);
    assert.match(css, /\.photo-trial-steps li:not\(:last-child\)::before\s*\{[^}]*top: calc\(var\(--trial-step-padding-y\) \+ var\(--trial-step-icon-size\) \/ 2 - 0\.5px\);[^}]*left: calc\(var\(--trial-step-padding-x\) \+ var\(--trial-step-number-size\) \/ 2\);[^}]*width: calc\(100% \+ var\(--trial-step-gap\)\);[^}]*repeating-linear-gradient\(to right/s);
});

test('mobile trial connectors follow each row and metadata aligns with its label without a guessed inset', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 860px)', css.indexOf('#photo-trial-modal {')));
    assert.match(mobile, /\.photo-trial-steps\s*\{[^}]*--trial-step-icon-size: 32px;/s);
    assert.match(mobile, /\.photo-trial-steps li:not\(:last-child\)::before\s*\{[^}]*left: calc\(var\(--trial-step-padding-x\) \+ var\(--trial-step-number-size\) \/ 2 - 0\.5px\);[^}]*height: calc\(100% \+ var\(--trial-step-gap\)\);[^}]*repeating-linear-gradient\(to bottom/s);
    assert.match(mobile, /grid-template-areas: "number icon label status" "\. \. detail detail"/);
    assert.doesNotMatch(mobile, /\.photo-trial-step-detail\s*\{[^}]*padding-left:/);
});

test('the empty trial title has heading emphasis without changing the selected editor title', () => {
    assert.match(css, /\.photo-trial-card:has\(\[data-trial-workspace\]\[hidden\]\) h2\s*\{[^}]*font-family: var\(--body\);[^}]*font-size: 30px;[^}]*font-weight: 750;/s);
    assert.match(css, /@media \(max-width: 860px\)[\s\S]*\.photo-trial-card:has\(\[data-trial-workspace\]\[hidden\]\) h2\s*\{[^}]*font-size: 24px;/s);
});
