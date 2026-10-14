import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { retireGoogleAnalytics, getCloudflareAnalyticsOptions, loadCloudflareAnalytics } from '../js/analytics.mjs';

test('retiring GA removes only its cookies and legacy consent, never login state', () => {
    const writes = [], removed = [];
    const document = {
        get cookie() { return '_ga=x; _ga_TEST123=x; session=keep; _gat_other=keep'; },
        set cookie(value) { writes.push(value); }
    };
    retireGoogleAnalytics({ document, hostname: 'ikkyee.com', storage: { removeItem: key => removed.push(key) } });
    assert.deepEqual(removed, ['ikkyee:analytics-consent:v1']);
    assert.equal(writes.length, 6);
    assert.ok(writes.every(value => /^_ga(?:_TEST123)?=; Max-Age=0; Path=\//.test(value)));
    assert.ok(writes.some(value => value.includes('Domain=.ikkyee.com')));
    assert.ok(writes.every(value => !/session=|_gat_other=/.test(value)));
});

test('cookie or storage restrictions cannot break application startup', () => {
    assert.doesNotThrow(() => retireGoogleAnalytics({
        document: { get cookie() { throw Error('blocked'); } },
        storage: { removeItem() { throw Error('blocked'); } }
    }));
});

test('retired analytics cannot reload Google even with the old runtime binding', async () => {
    const source = await readFile(new URL('../functions/api/config.js', import.meta.url), 'utf8');
    const { onRequestGet } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
    const response = await onRequestGet({ env: { GOOGLE_ANALYTICS_MEASUREMENT_ID: 'G-Y86DQ6ZVHR', GOOGLE_MAPS_API_KEY: 'maps-key' } });
    assert.deepEqual(await response.json(), { googleMapsApiKey: 'maps-key', googleMapsMapId: '', cloudflareAnalyticsToken: '' });
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    const ui = await readFile(new URL('../js/analytics-ui.mjs', import.meta.url), 'utf8');
    const helper = await readFile(new URL('../js/analytics.mjs', import.meta.url), 'utf8');
    assert.doesNotMatch(ui + helper, /googletagmanager|google-analytics|createAnalyticsController|dataLayer|fetchApi/);
});

test('cookie-free analytics is limited to production public entry pages, not native apps', () => {
    const options = { location: { protocol: 'https:', hostname: 'ikkyee.com' }, page: 'home', token: 'c3544ec773524f6987e6ce84dc4476c3' };
    assert.deepEqual(getCloudflareAnalyticsOptions(options), { token: options.token, spa: false });
    for (const page of ['settings', 'photos', 'liked', 'profile', 'trip', 'upload', 'admin', 'auth']) {
        assert.equal(getCloudflareAnalyticsOptions({ ...options, page }), null);
    }
    assert.equal(getCloudflareAnalyticsOptions({ ...options, native: true }), null);
    assert.equal(getCloudflareAnalyticsOptions({ ...options, token: 'invalid' }), null);
    assert.equal(getCloudflareAnalyticsOptions({ ...options, location: { protocol: 'https:', hostname: 'dev.practice-week1-cws.pages.dev' } }), null);
    assert.equal(getCloudflareAnalyticsOptions({ ...options, location: { protocol: 'http:', hostname: 'ikkyee.com' } }), null);
});

test('official Cloudflare beacon has no persistent identity and uses no referrer on its script request', () => {
    const scripts = [];
    const document = { createElement: () => ({ dataset: {} }), head: { append: element => scripts.push(element) } };
    loadCloudflareAnalytics(document, { token: 'c3544ec773524f6987e6ce84dc4476c3', spa: false });
    assert.equal(scripts[0].src, 'https://static.cloudflareinsights.com/beacon.min.js');
    assert.equal(scripts[0].referrerPolicy, 'no-referrer');
    assert.deepEqual(JSON.parse(scripts[0].dataset.cfBeacon), { token: 'c3544ec773524f6987e6ce84dc4476c3', spa: false });
});

test('edge config excludes EEA, UK and Switzerland and never enables preview collection', async () => {
    const source = await readFile(new URL('../functions/api/config.js', import.meta.url), 'utf8');
    const { onRequestGet } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
    const config = async (host, country) => (await (await onRequestGet({ env: {}, request: { url: `https://${host}/api/config`, cf: { country } } })).json()).cloudflareAnalyticsToken;
    assert.match(await config('ikkyee.com', 'KR'), /^[a-f0-9]{32}$/);
    for (const country of ['DE', 'FR', 'GB', 'CH', 'NO', undefined, 'XX', 'T1']) assert.equal(await config('ikkyee.com', country), '');
    assert.equal(await config('dev.practice-week1-cws.pages.dev', 'KR'), '');
});

test('visitors have an analytics notice without a consent banner or toggle', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');
    const policy = await readFile(new URL('../public/privacy/index.html', import.meta.url), 'utf8');
    assert.doesNotMatch(html + css, /analytics-consent-banner|analytics-preferences|data-analytics-choice|settings-analytics-consent|data-analytics-open/);
    assert.ok(html.includes('href="/privacy/#analytics">방문 통계 안내'));
    assert.ok(html.includes('src="/js/analytics-ui.mjs"'));
    assert.match(policy, /Cloudflare Web Analytics/);
    assert.match(policy, /쿠키/);
    assert.match(policy, /방문 횟수/);
    assert.match(policy, /고유한 사람 수/);
});
