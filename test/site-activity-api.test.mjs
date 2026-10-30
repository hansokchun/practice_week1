import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collectSiteActivity } from '../functions/lib/site-activity.mjs';

const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', SITE_ANALYTICS_INGEST_KEY: 'a'.repeat(64) };
const request = ({ body = '{"seconds":25}', method = 'POST', origin = 'https://ikkyee.com', url = 'https://ikkyee.com/api/site-activity', headers = {} } = {}) => new Request(url, {
    method, headers: { origin, 'content-type': 'text/plain;charset=UTF-8', 'sec-fetch-site': 'same-origin', ...headers }, ...(method === 'GET' ? {} : { body })
});
function fixture(options = {}) {
    const calls = [];
    return { calls, run: overrides => collectSiteActivity({ request: request(), env, allowed: true, ...overrides }, async (...args) => {
        calls.push(args);
        if (options.error) throw options.error;
        return new Response(options.body ?? 'true', { status: options.status ?? 200 });
    }) };
}

test('allowed same-origin collection sends only seconds and the server secret to the fixed RPC', async () => {
    const { calls, run } = fixture();
    const response = await run();
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal(calls.length, 1);
    const [url, options] = calls[0];
    assert.equal(url, 'https://example.supabase.co/rest/v1/rpc/record_site_activity');
    assert.equal(options.method, 'POST');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers.apikey, env.SUPABASE_PUBLISHABLE_KEY);
    assert.equal(options.headers.authorization, undefined);
    assert.deepEqual(JSON.parse(options.body), { p_seconds: 25, p_ingest_key: env.SITE_ANALYTICS_INGEST_KEY });
    assert.ok(options.signal instanceof AbortSignal);
    assert.doesNotMatch(await response.text(), new RegExp(env.SITE_ANALYTICS_INGEST_KEY));
});

test('country/production policy and incomplete configuration return no-content without upstream calls', async () => {
    const cases = [{ allowed: false }, ...Object.keys(env).map(key => ({ env: { ...env, [key]: '' } })),
        { request: request({ url: 'https://dev.practice-week1-cws.pages.dev/api/site-activity', origin: 'https://dev.practice-week1-cws.pages.dev' }) },
        { request: request({ url: 'http://ikkyee.com/api/site-activity', origin: 'http://ikkyee.com' }) }];
    for (const options of cases) {
        const { calls, run } = fixture();
        assert.equal((await run(options)).status, 204);
        assert.equal(calls.length, 0);
    }
});

test('non-POST methods and foreign origins never reach storage', async () => {
    for (const method of ['GET', 'PUT', 'OPTIONS']) {
        const { calls, run } = fixture();
        assert.equal((await run({ request: request({ method }) })).status, 405);
        assert.equal(calls.length, 0);
    }
    for (const headers of [{ origin: 'https://evil.example' }, { origin: '' }, { 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': 'same-site' }]) {
        const { calls, run } = fixture();
        assert.equal((await run({ request: request({ headers }) })).status, 403);
        assert.equal(calls.length, 0);
    }
});

test('known crawlers are ignored and a missing Fetch Metadata header remains compatible with beacons', async () => {
    for (const agent of ['Googlebot/2.1', 'bingbot', 'DuckDuckBot', 'facebookexternalhit', 'HeadlessChrome']) {
        const { calls, run } = fixture();
        assert.equal((await run({ request: request({ headers: { 'user-agent': agent } }) })).status, 204);
        assert.equal(calls.length, 0);
    }
    const req = request();
    req.headers.delete('sec-fetch-site');
    assert.equal((await fixture().run({ request: req })).status, 204);
});

test('only an exact bounded integer-seconds object in a supported content type is accepted', async () => {
    const bodies = ['null', '[]', '{}', '{"seconds":0}', '{"seconds":3601}', '{"seconds":1.5}', '{"seconds":"25"}',
        '{"seconds":25,"userId":"private"}', '{"seconds":25,"ip":"127.0.0.1"}', '{', ' '.repeat(129), '가'.repeat(44)];
    for (const body of bodies) {
        const { calls, run } = fixture();
        assert.equal((await run({ request: request({ body }) })).status, 400);
        assert.equal(calls.length, 0);
    }
    const { calls, run } = fixture();
    assert.equal((await run({ request: request({ headers: { 'content-type': 'application/x-www-form-urlencoded' } }) })).status, 415);
    assert.equal(calls.length, 0);
    for (const seconds of [1, 3600]) assert.equal((await fixture().run({ request: request({ body: JSON.stringify({ seconds }), headers: { 'content-type': 'application/json' } }) })).status, 204);
});

test('oversized streamed payload is cancelled before it can be fully buffered', async () => {
    let cancelled = false;
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(129)); }, cancel() { cancelled = true; } });
    const req = new Request('https://ikkyee.com/api/site-activity', { method: 'POST', headers: { origin: 'https://ikkyee.com', 'content-type': 'text/plain' }, body: stream, duplex: 'half' });
    const { calls, run } = fixture();
    assert.equal((await run({ request: req })).status, 400);
    assert.equal(cancelled, true);
    assert.equal(calls.length, 0);
});

test('split-byte payloads are counted in bytes and invalid UTF-8 fails before storage', async () => {
    for (const chunks of [[new TextEncoder().encode(' '.repeat(100)), new TextEncoder().encode(' '.repeat(29))],
        [new Uint8Array([0xc3, 0x28])]]) {
        const stream = new ReadableStream({ start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); } });
        const req = new Request('https://ikkyee.com/api/site-activity', { method: 'POST', headers: { origin: 'https://ikkyee.com', 'content-type': 'text/plain' }, body: stream, duplex: 'half' });
        const { calls, run } = fixture();
        assert.equal((await run({ request: req })).status, 400);
        assert.equal(calls.length, 0);
    }
});

test('www requires its own exact origin and secret-looking API keys are rejected', async () => {
    assert.equal((await fixture().run({ request: request({ url: 'https://www.ikkyee.com/api/site-activity', origin: 'https://www.ikkyee.com' }) })).status, 204);
    const foreign = fixture();
    assert.equal((await foreign.run({ request: request({ url: 'https://www.ikkyee.com/api/site-activity' }) })).status, 403);
    assert.equal(foreign.calls.length, 0);
    const secret = fixture();
    assert.equal((await secret.run({ env: { ...env, SUPABASE_PUBLISHABLE_KEY: 'sb_secret_private' } })).status, 204);
    assert.equal(secret.calls.length, 0);
});

test('malformed/foreign Supabase destinations and unreasonable ingestion keys stay disabled', async () => {
    for (const url of ['http://example.supabase.co', 'https://evil.example', 'https://example.supabase.co.evil.example',
        'https://example.supabase.co/path', 'https://user:pass@example.supabase.co', 'https://example.supabase.co?key=x', 'https://example.supabase.co:444']) {
        const { calls, run } = fixture();
        assert.equal((await run({ env: { ...env, SUPABASE_URL: url } })).status, 204);
        assert.equal(calls.length, 0);
    }
    for (const key of ['short', 'a'.repeat(257)]) assert.equal((await fixture().run({ env: { ...env, SITE_ANALYTICS_INGEST_KEY: key } })).status, 204);
});

test('capped false is successful; network, nonboolean and upstream errors reveal no diagnostics', async () => {
    assert.equal((await fixture({ body: 'false' }).run()).status, 204);
    for (const options of [{ error: new Error('server secret') }, { status: 500, body: 'server secret' },
        { body: '{"error":"server secret"}' }, { body: 'server secret' }, { body: ' '.repeat(129) }]) {
        const response = await fixture(options).run();
        assert.equal(response.status, 503);
        assert.doesNotMatch(await response.text(), /server secret/);
    }
});

test('Workers-compatible manual redirects reject redirects without forwarding the ingestion secret', async () => {
    const calls = [];
    const response = await collectSiteActivity({ request: request(), env, allowed: true }, async (...args) => {
        calls.push(args);
        if (!['follow', 'manual'].includes(args[1].redirect)) throw new TypeError('Invalid redirect value');
        return new Response(null, { status: 302, headers: { Location: 'https://untrusted.example' } });
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0][1].redirect, 'manual');
    assert.equal(response.status, 503);
    assert.equal(await response.text(), '');
});

test('Pages wrapper consumes the existing runtime-config policy and handles every method', () => {
    const source = readFileSync('functions/api/site-activity.js', 'utf8');
    assert.match(source, /import\s*\{\s*onRequestGet\s*\}\s*from ['"]\.\/config\.js['"]/);
    assert.match(source, /export async function onRequest\(/);
    assert.match(source, /await onRequestGet\(context\)/);
    assert.match(source, /allowed: config\.siteActivityEnabled === true/);
    assert.doesNotMatch(source, /EXCLUDED_ANALYTICS_COUNTRIES|request\.cf|\.country/);
});
