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
    assert.match(headers, /Content-Security-Policy: base-uri 'self'; object-src 'none'; frame-ancestors 'none'/);
});
