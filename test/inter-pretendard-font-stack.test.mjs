import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('style.css', 'utf8');

test('site loads Google Fonts Nanum Gothic for all public text', () => {
  assert.match(html, /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">/);
  assert.match(html, /<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/);
  assert.match(html, /family=Nanum\+Gothic:wght@400;700;800&display=swap/);
  assert.doesNotMatch(html, /family=Inter|SUIT-Variable|cdn\.jsdelivr\.net\/gh\/sunn-us\/SUIT/);
  assert.match(css, /--headline:\s*'Nanum Gothic',\s*sans-serif;/);
  assert.match(css, /--body:\s*'Nanum Gothic',\s*sans-serif;/);
  assert.match(css, /--brand:\s*'Nanum Gothic',\s*sans-serif;/);
  assert.match(css, /body\s*\{[^}]*font-synthesis:\s*none;/s);
});

test('only Material Symbols keeps a dedicated non-Nanum icon font', () => {
  assert.match(css, /\.brand\s*\{[^}]*font-family:\s*var\(--brand\);/s);
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
