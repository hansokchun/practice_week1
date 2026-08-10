import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const headers = readFileSync('public/_headers', 'utf8');

test('Cloudflare Pages static responses use baseline security headers', () => {
    assert.match(headers, /^\/\*$/m);
    assert.match(headers, /X-Frame-Options: DENY/);
    assert.match(headers, /X-Content-Type-Options: nosniff/);
    assert.match(headers, /Referrer-Policy: strict-origin-when-cross-origin/);
    assert.match(headers, /Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(\), payment=\(\), usb=\(\)/);
    assert.match(headers, /Content-Security-Policy: default-src 'self';/);
    assert.match(headers, /script-src 'self' 'unsafe-inline' 'unsafe-eval' https:\/\/cdn\.jsdelivr\.net https:\/\/t1\.kakaocdn\.net https:\/\/challenges\.cloudflare\.com https:\/\/\*\.googleapis\.com https:\/\/\*\.gstatic\.com \*\.google\.com blob:;/);
    assert.match(headers, /connect-src 'self' https:\/\/\*\.supabase\.co wss:\/\/\*\.supabase\.co https:\/\/\*\.kakao\.com https:\/\/\*\.kakaocdn\.net https:\/\/challenges\.cloudflare\.com/);
    assert.match(headers, /frame-src https:\/\/challenges\.cloudflare\.com \*\.google\.com;/);
    assert.match(headers, /object-src 'none';/);
    assert.match(headers, /base-uri 'self';/);
    assert.match(headers, /form-action 'self';/);
    assert.match(headers, /frame-ancestors 'none'/);
});

test('Cloudflare Pages caches only fingerprinted build assets long term', () => {
    assert.match(headers, /^\/assets\/\*$/m);
    assert.match(headers, /Cache-Control: public, max-age=31536000, immutable/);
    const rootRule = headers.slice(headers.indexOf('/*'), headers.indexOf('/assets/*'));
    assert.doesNotMatch(rootRule, /Cache-Control:/);
});
