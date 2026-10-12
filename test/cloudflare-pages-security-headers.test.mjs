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
    assert.match(headers, /script-src 'self' 'unsafe-inline' 'unsafe-eval' https:\/\/cdn\.jsdelivr\.net https:\/\/t1\.kakaocdn\.net https:\/\/challenges\.cloudflare\.com https:\/\/\*\.googleapis\.com https:\/\/\*\.gstatic\.com \*\.google\.com https:\/\/www\.googletagmanager\.com blob:;/);
    assert.match(headers, /connect-src 'self' https:\/\/\*\.supabase\.co wss:\/\/\*\.supabase\.co https:\/\/\*\.kakao\.com https:\/\/\*\.kakaocdn\.net https:\/\/challenges\.cloudflare\.com/);
    assert.match(headers, /frame-src https:\/\/challenges\.cloudflare\.com \*\.google\.com;/);
    assert.match(headers, /object-src 'none';/);
    assert.match(headers, /base-uri 'self';/);
    assert.match(headers, /form-action 'self' https:\/\/sharer\.kakao\.com https:\/\/accounts\.kakao\.com;/);
    assert.match(headers, /frame-ancestors 'none'/);
});

test('analytics CSP allows the tag and collection without adding advertising hosts', () => {
    const connect = headers.match(/connect-src ([^;]+);/)[1];
    assert.match(connect, /https:\/\/\*\.google-analytics\.com/);
    assert.match(connect, /https:\/\/www\.googletagmanager\.com/);
    assert.doesNotMatch(headers, /doubleclick\.net|googleadservices\.com|googlesyndication\.com/);
});

test('critical build files are revalidated instead of caching an HTML fallback long term', () => {
    assert.match(headers, /^\/assets\/\*$/m);
    const assetRule = headers.slice(headers.indexOf('/assets/*'), headers.indexOf('/social-preview.jpg'));
    assert.match(assetRule, /Cache-Control: public, max-age=0, must-revalidate/);
    assert.doesNotMatch(assetRule, /immutable/);
    const rootRule = headers.slice(headers.indexOf('/*'), headers.indexOf('/assets/*'));
    assert.doesNotMatch(rootRule, /Cache-Control:/);
    assert.match(headers, /^\/\n  Cache-Control: no-cache, must-revalidate/m);
    assert.match(headers, /^\/stylesheet-recovery\.js\n  Cache-Control: no-cache, must-revalidate/m);
});
