import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('style.css', 'utf8');
const legalCss = readFileSync('public/legal.css', 'utf8');

test('site loads version-pinned Pretendard variable subsets for public and legal text', () => {
  assert.match(html, /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">/);
  assert.match(html, /<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/);
  assert.match(html, /pretendard@v1\.3\.9\/dist\/web\/variable\/pretendardvariable-dynamic-subset\.min\.css/);
  assert.match(legalCss, /pretendard@v1\.3\.9\/dist\/web\/variable\/pretendardvariable-dynamic-subset\.min\.css/);
  assert.match(legalCss, /font-family:\s*'Pretendard Variable',\s*Pretendard,/);
  assert.doesNotMatch(html + css + legalCss, /Nanum[ +]Gothic/);
  assert.doesNotMatch(html, /family=Inter|SUIT-Variable|cdn\.jsdelivr\.net\/gh\/sunn-us\/SUIT/);
  assert.match(css, /--headline:\s*'Pretendard Variable',\s*Pretendard,/);
  assert.match(css, /--body:\s*'Pretendard Variable',\s*Pretendard,/);
  assert.match(css, /--brand:\s*'Pretendard Variable',\s*Pretendard,/);
  assert.match(css, /body\s*\{[^}]*font-synthesis:\s*none;/s);
});

test('only the Ikkyee wordmark and Material Symbols use dedicated non-Pretendard fonts', () => {
    assert.match(css, /\.brand\s*\{[^}]*font-family:\s*var\(--brand\);/s);
    assert.match(css, /\.brand-wordmark\s*\{[^}]*font-family:\s*'Cormorant Garamond',\s*serif;/s);
    assert.match(css, /\.home-houses-reference__word\s*\{[^}]*font-family:\s*var\(--brand\);/s);
    assert.match(css, /\.site-footer__brand h2\s*\{[^}]*font-family:\s*var\(--brand\);/s);
    assert.match(css, /font-family:\s*"Material Symbols Outlined";/);
    assert.doesNotMatch(css, /font-family:\s*(?:'SUIT Variable'|'SUIT'|'Inter'|Georgia|'Times New Roman')/);
  assert.doesNotMatch(css, /font-family:\s*var\(--font\)/);
  assert.doesNotMatch(css, /letter-spacing:\s*-/);
});

test('external scripts are deferred without removing route modules', () => {
  assert.doesNotMatch(html, /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/);
  assert.match(html, /cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\.112\.2\/dist\/umd\/supabase\.min\.js" defer/);
  assert.match(html, /<script type="module" src="\/js\/app\.js"><\/script>/);
});
