import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('style.css', 'utf8');

test('site uses SUIT and Inter as the primary public font stack', () => {
  assert.match(html, /family=Inter:wght@400;500;600;700;800;900/);
  assert.match(html, /cdn.jsdelivr.net\/gh\/sunn-us\/SUIT\/fonts\/variable\/woff2\/SUIT-Variable\.css/);
  assert.match(css, /--headline:\s*'SUIT Variable',\s*'SUIT',\s*'Inter',\s*sans-serif;/);
  assert.match(css, /--body:\s*'SUIT Variable',\s*'SUIT',\s*'Inter',\s*sans-serif;/);
});

test('brand logo typography keeps its existing serif treatment', () => {
  assert.match(css, /\.brand\s*\{[^}]*font-family:\s*Georgia,\s*'Times New Roman',\s*var\(--headline\);/s);
});
