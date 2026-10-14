import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bindNativeExternalLinks } from '../js/native-external-links.mjs';

const native = { isNativePlatform: () => true };

function harness({ capacitor = native, baseURI = 'https://localhost/index.html', loadBrowser, onError } = {}) {
    const listeners = new Set();
    const document = {
        baseURI,
        addEventListener(type, listener) { assert.equal(type, 'click'); listeners.add(listener); },
        removeEventListener(type, listener) { assert.equal(type, 'click'); listeners.delete(listener); }
    };
    const cleanup = bindNativeExternalLinks({ capacitor, document, loadBrowser, onError });
    function click(href, options = {}) {
        const anchor = {
            getAttribute(name) { return name === 'href' ? href : name === 'aria-disabled' && options.disabled ? 'true' : null; },
            hasAttribute(name) { return name === 'download' && options.download === true; },
            closest(selector) { return selector === '[aria-disabled="true"]' && options.disabled ? anchor : null; }
        };
        const event = {
            target: { closest(selector) { return selector === 'a[href]' ? anchor : null; } },
            button: 0,
            defaultPrevented: false,
            preventDefault() { this.defaultPrevented = true; },
            ...options
        };
        for (const listener of listeners) listener(event);
        return event;
    }
    return { click, cleanup, listeners };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

test('web installs no listener and never loads native plugins', () => {
    let loaded = false;
    const subject = harness({ capacitor: { isNativePlatform: () => false }, loadBrowser: async () => { loaded = true; } });
    assert.equal(subject.listeners.size, 0);
    assert.equal(subject.click('/privacy/').defaultPrevented, false);
    subject.cleanup();
    assert.equal(loaded, false);
});

test('native policies use the fixed public HTTPS origin and intercept before awaiting the browser', async () => {
    const calls = [];
    const subject = harness({ loadBrowser: async () => ({ open: async options => calls.push(options) }) });
    for (const path of ['/privacy/', '/support/', '/account-deletion/', '/privacy/#analytics']) {
        assert.equal(subject.click(path).defaultPrevented, true);
    }
    await settle();
    assert.deepEqual(calls, ['/privacy/', '/support/', '/account-deletion/', '/privacy/#analytics']
        .map(path => ({ url: `https://ikkyee.com${path}` })));
});

test('native policy links also support the current iOS local origin and approved public absolute URLs', async () => {
    const calls = [];
    const subject = harness({ baseURI: 'capacitor://localhost/index.html', loadBrowser: async () => ({ open: async options => calls.push(options.url) }) });
    subject.click('capacitor://localhost/privacy/#analytics');
    subject.click('https://ikkyee.com/support/');
    await settle();
    assert.deepEqual(calls, ['https://ikkyee.com/privacy/#analytics', 'https://ikkyee.com/support/']);
});

test('Google Maps accepts only the photo-detail search contract with valid plain coordinates', async () => {
    const calls = [];
    const subject = harness({ loadBrowser: async () => ({ open: async options => calls.push(options.url) }) });
    for (const pair of ['37.5665,126.978', '-90,-180', '90,180', '0,0']) {
        assert.equal(subject.click(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pair)}`).defaultPrevented, true);
    }
    await settle();
    assert.equal(calls.length, 4);
    assert.equal(new URL(calls[0]).searchParams.get('query'), '37.5665,126.978');
});

test('unsupported external destinations and credential-bearing or malformed links cannot navigate', async () => {
    const calls = [];
    const errors = [];
    const subject = harness({ loadBrowser: async () => ({ open: async options => calls.push(options) }), onError: error => errors.push(error) });
    const refused = [
        'https://evil.example/privacy/',
        'https://ikkyee.com/auth/callback?code=credential',
        'ikkyee://auth/callback?code=credential',
        'javascript:alert(1)',
        'https://person:secret@ikkyee.com/privacy/',
        'https://ikkyee.com:444/privacy/',
        '/privacy/?access_token=credential',
        '/privacy/#other',
        '//evil.example/privacy/',
        'https://www.google.com/maps/search/?api=1&query=91,0',
        'https://www.google.com/maps/search/?api=1&query=0,-181',
        'https://www.google.com/maps/search/?api=1&query=Infinity,0',
        'https://www.google.com/maps/search/?api=1&query=0,0&access_token=credential',
        'https://www.google.com/maps/search/?api=1&api=1&query=0,0',
        'https://www.google.com/maps/search/?api=1&query=0,0#other',
        'https://google.com/maps/search/?api=1&query=0,0'
    ];
    for (const href of refused) assert.equal(subject.click(href).defaultPrevented, true, href);
    await settle();
    assert.equal(calls.length, 0);
    assert.equal(errors.length, refused.length);
    assert.ok(errors.every(error => error.message === '외부 페이지를 열지 못했어요. 다시 시도해 주세요.'));
});

test('hash routes, downloads, modified clicks and disabled links remain untouched', async () => {
    let loaded = false;
    const subject = harness({ loadBrowser: async () => { loaded = true; } });
    for (const [href, options] of [
        ['#/explore', {}], ['/images/logo.png', {}], ['/privacy/', { download: true }],
        ['/privacy/', { ctrlKey: true }], ['/privacy/', { metaKey: true }],
        ['/privacy/', { altKey: true }], ['/privacy/', { shiftKey: true }],
        ['/privacy/', { button: 1 }], ['/privacy/', { disabled: true }]
    ]) assert.equal(subject.click(href, options).defaultPrevented, false);
    await settle();
    assert.equal(loaded, false);
});

test('browser failures expose only a generic error and cleanup removes the owned listener', async () => {
    const errors = [];
    const subject = harness({ loadBrowser: async () => { throw new Error('private native provider detail'); }, onError: error => errors.push(error) });
    subject.click('/privacy/');
    await settle();
    assert.equal(errors[0].message, '외부 페이지를 열지 못했어요. 다시 시도해 주세요.');
    subject.cleanup();
    subject.cleanup();
    assert.equal(subject.listeners.size, 0);
    assert.equal(subject.click('/support/').defaultPrevented, false);
});

test('cleanup before a delayed plugin load prevents later external navigation', async () => {
    let resolvePlugin;
    let opened = false;
    const subject = harness({ loadBrowser: () => new Promise(resolve => { resolvePlugin = resolve; }) });
    subject.click('/privacy/');
    subject.cleanup();
    resolvePlugin({ open: async () => { opened = true; } });
    await settle();
    assert.equal(opened, false);
});
