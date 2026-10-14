import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createNativeContentSecurityPlugin } from '../scripts/native-content-security.mjs';

test('native HTML uses the existing web CSP without meta-unsupported response directives', () => {
    const plugin = createNativeContentSecurityPlugin();
    const tags = plugin.transformIndexHtml.handler().tags;
    assert.equal(tags[0].attrs.charset, 'UTF-8');
    const policy = tags.find(tag => tag.attrs?.['http-equiv'] === 'Content-Security-Policy');
    const existing = readFileSync('public/_headers', 'utf8');
    assert.equal(policy.injectTo, 'head-prepend');
    assert.match(policy.attrs.content, /object-src 'none'/);
    assert.match(policy.attrs.content, /base-uri 'self'/);
    assert.match(policy.attrs.content, /https:\/\/\*\.supabase\.co/);
    assert.match(policy.attrs.content, /https:\/\/challenges\.cloudflare\.com/);
    assert.doesNotMatch(policy.attrs.content, /frame-ancestors|report-uri|sandbox/);
    assert.ok(existing.includes(`${policy.attrs.content}; frame-ancestors 'none'`));
    assert.equal(tags.find(tag => tag.attrs?.name === 'referrer').attrs.content, 'strict-origin-when-cross-origin');
});

test('CSP injection runs before application scripts and refuses a missing configured policy', () => {
    assert.equal(createNativeContentSecurityPlugin().transformIndexHtml.order, 'pre');
    assert.throws(() => createNativeContentSecurityPlugin({ headers: 'Cache-Control: no-store' }), /Content-Security-Policy/);
    const transformed = createNativeContentSecurityPlugin().transformIndexHtml.handler('<head><meta charset="UTF-8"><script></script></head>');
    assert.doesNotMatch(transformed.html, /charset=/);
});
