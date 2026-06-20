import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('site uses a Google Photos-like Roboto and Noto Sans KR font stack', () => {
    const html = readFileSync('index.html', 'utf8');
    const css = readFileSync('style.css', 'utf8');

    assert.match(html, /family=Noto\+Sans\+KR/);
    assert.match(html, /family=Noto\+Sans\+KR[\s\S]*family=Roboto/);
    assert.match(css, /--google-ui:\s*'Roboto',\s*'Noto Sans KR',\s*Arial,\s*sans-serif;/);
    assert.match(css, /--headline:\s*var\(--google-ui\);/);
    assert.match(css, /--body:\s*var\(--google-ui\);/);
    assert.doesNotMatch(html + css, /Be Vietnam Pro|Hanken Grotesk|Pretendard|Georgia/);
});
