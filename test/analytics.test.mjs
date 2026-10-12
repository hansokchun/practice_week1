import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
    ANALYTICS_CONSENT_KEY,
    normalizeAnalyticsId,
    getAnalyticsPage,
    getAnalyticsReferrer,
    loadAnalyticsConsent,
    createAnalyticsController
} from '../js/analytics.mjs';

function fixture({ consent = null, loader = async () => {} } = {}) {
    const values = new Map(consent ? [[ANALYTICS_CONSENT_KEY, consent]] : []);
    const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
    const window = { location: { protocol: 'https:', hostname: 'ikkyee.com' } };
    const writes = [];
    const document = { referrer: 'https://www.google.com/search?q=private', get cookie() { return '_ga=x; _ga_TEST123=x; session=keep'; }, set cookie(value) { writes.push(value); } };
    const loads = [];
    const controller = createAnalyticsController({ window, document, storage, loadScript: async id => { loads.push(id); await loader(); } });
    return { window, controller, loads, writes, values };
}

test('analytics configuration accepts only GA4 measurement IDs', () => {
    assert.equal(normalizeAnalyticsId(' G-ABC1234567 '), 'G-ABC1234567');
    for (const id of ['UA-123', 'G-', 'G-abc123', 'G-ABC?secret=1', null, {}]) assert.equal(normalizeAnalyticsId(id), '');
});

test('analytics page metadata is an allowlist, never a raw content URL', () => {
    assert.deepEqual(getAnalyticsPage('explore'), { page_location: 'https://ikkyee.com/map', page_title: '지도', page_path: '/map' });
    assert.equal(getAnalyticsPage('tag').page_path, '/topics');
    for (const route of ['admin-accounts', 'settings', 'upload', 'location-assign', 'auth', 'trip?id=private', undefined]) assert.equal(getAnalyticsPage(route), null);
    assert.equal(getAnalyticsReferrer('https://google.com/search?q=secret#token'), 'https://google.com/');
    assert.equal(getAnalyticsReferrer('https://ikkyee.com/#/trip?id=secret'), '');
    assert.equal(getAnalyticsReferrer('javascript:alert(1)'), '');
});

test('analytics consent is browser-scoped, strict and defaults to undecided', () => {
    for (const raw of [null, 'true', '{', JSON.stringify({ version: 1, choice: 'yes' }), JSON.stringify({ version: 0, choice: 'granted' })]) {
        assert.equal(loadAnalyticsConsent({ getItem: () => raw }), null);
    }
    assert.equal(loadAnalyticsConsent({ getItem: () => JSON.stringify({ version: 1, choice: 'granted' }) }), 'granted');
    assert.equal(loadAnalyticsConsent({ getItem: () => { throw Error('blocked'); } }), null);
});

test('no tag is loaded without config, production host, consent and a public page', async () => {
    const f = fixture();
    await f.controller.page('home');
    await f.controller.configure('G-TEST123');
    assert.deepEqual(f.loads, []);
    await f.controller.choose('denied');
    await f.controller.page('explore');
    assert.deepEqual(f.loads, []);
    await f.controller.page('settings');
    await f.controller.choose('granted');
    assert.deepEqual(f.loads, []);
    f.window.location.hostname = 'dev.practice-week1-cws.pages.dev';
    await f.controller.page('home');
    assert.deepEqual(f.loads, []);
    f.window.location.hostname = 'ikkyee.com';
    await f.controller.page('home');
    assert.deepEqual(f.loads, ['G-TEST123']);
});

test('manual pageviews are deduplicated and carry no account or photo metadata', async () => {
    const f = fixture();
    await f.controller.configure('G-TEST123');
    await f.controller.page('home');
    await f.controller.choose('granted');
    await f.controller.page('home');
    await f.controller.page('explore');
    const commands = f.window.dataLayer.map(args => Array.from(args));
    const config = commands.find(args => args[0] === 'config')[2];
    assert.equal(config.send_page_view, false);
    assert.equal(config.allow_google_signals, false);
    assert.equal(config.allow_ad_personalization_signals, false);
    assert.equal(config.cookie_update, false);
    const views = commands.filter(args => args[0] === 'event');
    assert.equal(views.length, 2);
    assert.deepEqual(views[1], ['event', 'page_view', { ...getAnalyticsPage('explore'), page_referrer: 'https://ikkyee.com/main', send_to: 'G-TEST123' }]);
    assert.equal(commands.find(args => args[0] === 'consent' && args[1] === 'update')[2].ad_storage, 'denied');
});

test('revoking pending consent blocks queued pageviews and clears only analytics cookies', async () => {
    let finish;
    const f = fixture({ loader: () => new Promise(resolve => { finish = resolve; }) });
    await f.controller.configure('G-TEST123');
    await f.controller.page('home');
    const pending = f.controller.choose('granted');
    await f.controller.choose('denied');
    finish();
    await pending;
    assert.equal(f.window['ga-disable-G-TEST123'], true);
    assert.equal(f.window.dataLayer.some(args => args[0] === 'event'), false);
    assert.ok(f.writes.some(value => value.startsWith('_ga=')));
    assert.ok(f.writes.every(value => !value.startsWith('session=')));
    assert.equal(JSON.parse(f.values.get(ANALYTICS_CONSENT_KEY)).choice, 'denied');
});

test('sensitive routes suspend tracking and returning to a public page resumes it', async () => {
    const f = fixture();
    await f.controller.configure('G-TEST123');
    await f.controller.page('home');
    await f.controller.choose('granted');
    await f.controller.page('admin-accounts');
    assert.equal(f.window['ga-disable-G-TEST123'], true);
    await f.controller.page('home');
    assert.equal(f.window['ga-disable-G-TEST123'], false);
    assert.equal(f.window.dataLayer.filter(args => args[0] === 'event').length, 2);
});

test('tag loading failures do not break navigation and can be retried', async () => {
    let attempts = 0;
    const f = fixture({ loader: async () => { if (!attempts++) throw Error('offline'); } });
    await f.controller.configure('G-TEST123');
    await f.controller.page('home');
    await f.controller.choose('granted');
    assert.equal(f.window.dataLayer.some(args => args[0] === 'event'), false);
    await f.controller.page('explore');
    assert.equal(f.window.dataLayer.filter(args => args[0] === 'event').length, 1);
});

test('Cloudflare runtime config exposes only a validated public analytics ID', async () => {
    const source = await readFile(new URL('../functions/api/config.js', import.meta.url), 'utf8');
    const { onRequestGet } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
    const response = await onRequestGet({ env: { GOOGLE_ANALYTICS_MEASUREMENT_ID: ' G-ABC1234567 ', SECRET: 'never-send' } });
    assert.equal((await response.json()).googleAnalyticsMeasurementId, 'G-ABC1234567');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal((await (await onRequestGet({ env: { GOOGLE_ANALYTICS_MEASUREMENT_ID: 'invalid' } })).json()).googleAnalyticsMeasurementId, '');
});

test('analytics entry stays independent of auth and exposes choices to logged-out visitors', async () => {
    const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    const ui = await readFile(new URL('../js/analytics-ui.mjs', import.meta.url), 'utf8');
    const policy = await readFile(new URL('../public/privacy/index.html', import.meta.url), 'utf8');
    assert.match(html, /id="analytics-preferences"/);
    assert.match(html, /data-analytics-open/);
    assert.match(html, /src="\/js\/analytics-ui.mjs"/);
    assert.match(ui, /MutationObserver/);
    assert.match(ui, /classList\.contains\('is-app-booting'\)/);
    assert.doesNotMatch(ui, /from ['"]\.\.\/auth|user_id|currentUser|location\.hash/);
    assert.match(policy, /Google Analytics/);
});
