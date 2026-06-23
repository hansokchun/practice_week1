import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('style.css', 'utf8');

test('site uses Inter and Pretendard as the primary public font stack', () => {
  assert.match(html, /family=Inter:wght@400;500;600;700;800;900/);
  assert.match(html, /cdn.jsdelivr.net\/gh\/orioncactus\/pretendard/);
  assert.match(css, /--headline:\s*'Inter',\s*'Pretendard',\s*sans-serif;/);
  assert.match(css, /--body:\s*'Inter',\s*'Pretendard',\s*sans-serif;/);
});

test('brand logo uses the wordmark asset instead of serif text styling', () => {
  assert.match(html, /class="brand"[\s\S]*images\/logo-wordmark\.svg/);
  assert.match(css, /\.brand img\s*\{[^}]*width:\s*176px;[^}]*height:\s*auto;/s);
});
