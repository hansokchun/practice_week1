import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('native home tag titles occupy a centered full-width row independent of action width', () => {
    const css = readFileSync('style.css', 'utf8');
    assert.match(css, /\.native-app \.page-home \.landing-section-heading\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto minmax\(0, 1fr\);/s);
    assert.match(css, /\.native-app \.page-home \.landing-section-heading h2\s*\{[^}]*grid-column:\s*1 \/ -1;[^}]*grid-row:\s*1;[^}]*margin:\s*0;[^}]*padding-inline:\s*76px;[^}]*text-align:\s*center;/s);
    assert.match(css, /\.native-app \.page-home \.landing-section-view-all\s*\{[^}]*grid-column:\s*3;[^}]*grid-row:\s*1;/s);
});
