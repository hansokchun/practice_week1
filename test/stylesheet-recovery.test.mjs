import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const scriptUrl = new URL('../public/stylesheet-recovery.js', import.meta.url);

function fixture({ href = 'https://ikkyee.com/assets/index-old.css', ready = false } = {}) {
    const handlers = new Map();
    const document = {
        documentElement: {},
        head: { querySelectorAll: () => [link] },
        addEventListener: (name, callback) => handlers.set(name, callback)
    };
    const link = { tagName: 'LINK', rel: 'stylesheet', href, addEventListener: (name, callback) => handlers.set(`link:${name}`, callback) };
    runInNewContext(readFileSync(scriptUrl, 'utf8'), {
        document, URL, location: { origin: 'https://ikkyee.com' },
        getComputedStyle: () => ({ getPropertyValue: () => ready ? '1' : '' }),
        Date: { now: () => 123456 }, WeakSet
    });
    return { link, handlers };
}

test('a failed app stylesheet is retried once with a fresh cache key', () => {
    const f = fixture();
    f.handlers.get('error')({ target: f.link });
    assert.equal(f.link.href, 'https://ikkyee.com/assets/index-old.css?ikkyee-style-retry=123456');
    f.handlers.get('error')({ target: f.link });
    assert.equal(f.link.href, 'https://ikkyee.com/assets/index-old.css?ikkyee-style-retry=123456');
});

test('the bootstrap recovers an error missed before DOMContentLoaded', () => {
    const f = fixture();
    f.handlers.get('DOMContentLoaded')();
    assert.match(f.link.href, /ikkyee-style-retry=/);
});

test('a healthy stylesheet does not make another network request', () => {
    const f = fixture({ ready: true });
    f.handlers.get('DOMContentLoaded')();
    assert.equal(f.link.href, 'https://ikkyee.com/assets/index-old.css');
});

test('font styles, external styles, images and non-stylesheet links are never retried', () => {
    for (const href of ['https://fonts.googleapis.com/style.css', 'https://ikkyee.com/legal.css', 'https://ikkyee.com/assets/logo.png']) {
        const f = fixture({ href });
        f.handlers.get('error')({ target: f.link });
        assert.equal(f.link.href, href);
    }
    const f = fixture();
    f.handlers.get('error')({ target: { tagName: 'IMG' } });
    f.link.rel = 'preload';
    f.handlers.get('error')({ target: f.link });
    assert.equal(f.link.href, 'https://ikkyee.com/assets/index-old.css');
});

test('style recovery executes before the app stylesheet and changes no application data', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
    const source = readFileSync(scriptUrl, 'utf8');
    assert.ok(html.indexOf('src="/stylesheet-recovery.js"') < html.indexOf('href="app.css"'));
    assert.match(css, /--ikkyee-styles-ready:\s*1;/);
    assert.doesNotMatch(source, /localStorage|sessionStorage|\.reload\(|fetch\(|supabase|dataLayer/);
});

test('missing static files have a real static error page instead of the SPA shell', () => {
    const error = readFileSync(new URL('../public/404.html', import.meta.url), 'utf8');
    assert.match(error, /페이지를 찾을 수 없습니다/);
    assert.doesNotMatch(error, /page-home|js\/app\.js|supabase/);
    assert.match(error, /href="\/#\/"/);
});
