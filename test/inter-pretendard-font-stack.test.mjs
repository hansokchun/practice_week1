import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('style.css', 'utf8');

test('site uses SUIT and Inter as the primary public font stack', () => {
  assert.match(html, /<link rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net">/);
  assert.match(html, /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">/);
  assert.match(html, /<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/);
  assert.match(html, /family=Inter:wght@400;500;600;700;800;900/);
  assert.doesNotMatch(html, /Oswald/);
  assert.match(html, /cdn.jsdelivr.net\/gh\/sunn-us\/SUIT\/fonts\/variable\/woff2\/SUIT-Variable\.css/);
  assert.match(css, /--headline:\s*'SUIT Variable',\s*'SUIT',\s*'Inter',\s*sans-serif;/);
  assert.match(css, /--body:\s*'SUIT Variable',\s*'SUIT',\s*'Inter',\s*sans-serif;/);
  assert.match(css, /--brand:\s*Georgia,\s*'Times New Roman',\s*var\(--headline\);/);
});

test('brand typography is the only non-icon serif exception', () => {
  assert.match(css, /\.brand\s*\{[^}]*font-family:\s*var\(--brand\);/s);
  assert.match(css, /\.home-houses-reference__word\s*\{[^}]*font-family:\s*var\(--brand\);/s);
  assert.match(css, /\.site-footer__brand h2\s*\{[^}]*font-family:\s*var\(--brand\);/s);
  assert.doesNotMatch(css, /font-family:\s*'Oswald'/);
  assert.doesNotMatch(css, /font-family:\s*var\(--font\)/);
  assert.doesNotMatch(css, /letter-spacing:\s*-/);
});

test('external scripts are deferred without removing route modules', () => {
  assert.match(html, /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit" defer/);
  assert.match(html, /cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\/dist\/umd\/supabase\.min\.js" defer/);
  assert.match(html, /<script type="module" src="\/js\/app\.js"><\/script>/);
});
