import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const css = readFileSync('style.css', 'utf8');

function rule(selector) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = [...css.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'g'))];
    assert.ok(matches.length, `missing rule: ${selector}`);
    return matches[0][1];
}

test('Explore uses light teal controls and a low-elevation discovery surface', () => {
    const trigger = rule('.explore-photo-scope-trigger');
    assert.match(trigger, /background:\s*var\(--action-soft\);/);
    assert.match(trigger, /color:\s*var\(--teal\);/);
    assert.match(trigger, /border:\s*1px solid rgba\(26, 77, 78, 0\.14\);/);
    assert.match(trigger, /box-shadow:\s*none;/);
    assert.doesNotMatch(trigger, /background:\s*var\(--teal-dark\)/);

    const panel = rule('.explore-discovery-panel');
    assert.match(panel, /border-radius:\s*14px;/);
    assert.match(panel, /box-shadow:\s*0 8px 24px rgba\(26, 77, 78, 0\.08\);/);
    const collapsed = rule('.explore-discovery-panel.is-collapsed');
    assert.match(collapsed, /background:\s*var\(--action-soft\);/);
    assert.match(rule('.explore-discovery-panel.is-collapsed .explore-discovery-header h2'), /color:\s*var\(--teal\);/);
});

test('Explore keeps light controls readable in its mobile photo drawer', () => {
    const mobile = css.slice(css.indexOf('    .explore-mobile-list-toggle {'));
    assert.match(mobile, /\.explore-mobile-list-toggle\s*\{[^}]*background:\s*var\(--action-soft\);[^}]*color:\s*var\(--teal\);/s);
    assert.match(rule('.explore-discovery-panel.is-mobile-open .explore-photo-scope-trigger > span'), /color:\s*inherit;/);
    assert.match(rule('.explore-discovery-header .explore-photo-scope-trigger > span'), /color:\s*inherit;/);
    assert.match(rule('.explore-photo-scope-trigger [data-explore-scope-trigger-label]'), /font-size:\s*inherit;/);
    assert.match(rule('.explore-discovery-toggle'), /box-shadow:\s*none;/);
});
