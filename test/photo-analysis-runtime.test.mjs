import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const endpoint = new URL('../functions/api/analyze-photo.js', import.meta.url);
const source = readFileSync(endpoint, 'utf8').replace('../../js/photo-ai-analysis.mjs', new URL('../js/photo-ai-analysis.mjs', import.meta.url).href);
const { onRequestPost } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

function fixture(t, { photo = {}, loseClaim = false, countFailure = false, oversized = false } = {}) {
    const previous = globalThis.fetch;
    t.after(() => { globalThis.fetch = previous; });
    const calls = [];
    const aiCalls = [];
    const row = { id: 'p', owner_id: 'owner', storage_path: 'owner/p.jpg', preview_path: 'owner/previews/p.jpg', ai_analysis_status: 'pending', ai_analyzed_at: null, ...photo };
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url: new URL(url), ...options });
        if (url.includes('/auth/v1/user')) return Response.json({ id: 'owner' });
        if (options.method === 'PATCH') {
            const patch = JSON.parse(options.body);
            return Response.json(loseClaim && patch.ai_analysis_status === 'processing' ? [] : [{ ...row, ...patch }]);
        }
        if (url.includes('/storage/')) return new Response(new Uint8Array(oversized ? 4 * 1024 * 1024 + 1 : 20), { headers: { 'Content-Type': 'image/jpeg' } });
        if (options.headers?.Prefer === 'count=exact') return countFailure
            ? new Response('', { status: 503 }) : Response.json([], { headers: { 'Content-Range': '0-0/0' } });
        return Response.json([row]);
    };
    const run = () => onRequestPost({
        request: new Request('https://example.com/api/analyze-photo', { method: 'POST', headers: { Authorization: 'Bearer test' }, body: JSON.stringify({ photoId: 'p' }) }),
        env: { AI: { run: async (...args) => {
            aiCalls.push(args);
            return aiCalls.length % 2 ? { answer: 'A quiet forest.' } : { response: { tags: ['숲'], summary: '숲', scene: 'forest', moods: [] } };
        } } }
    });
    return { run, calls, aiCalls };
}

test('analysis downloads the prepared preview instead of the original', async (t) => {
    const { run, calls, aiCalls } = fixture(t);
    assert.equal((await run()).status, 200);
    assert.ok(calls.find((call) => call.url.pathname.endsWith('/owner/previews/p.jpg')));
    assert.equal(aiCalls.length, 2);
    const claim = calls.find((call) => call.method === 'PATCH');
    assert.equal(claim.url.searchParams.get('ai_analysis_status'), 'eq.pending');
    assert.equal(claim.url.searchParams.get('ai_analyzed_at'), 'is.null');
});

test('a request losing the atomic claim neither downloads nor analyzes nor overwrites status', async (t) => {
    const { run, calls, aiCalls } = fixture(t, { loseClaim: true });
    assert.equal((await run()).status, 409);
    assert.equal(aiCalls.length, 0);
    assert.equal(calls.filter((call) => call.method === 'PATCH').length, 1);
    assert.equal(calls.some((call) => call.url.pathname.includes('/storage/')), false);
});

test('quota lookup failure does not mark an unclaimed photo failed', async (t) => {
    const { run, calls } = fixture(t, { countFailure: true });
    assert.equal((await run()).status, 502);
    assert.equal(calls.some((call) => call.method === 'PATCH'), false);
});

test('legacy images still analyze and oversized images never reach AI', async (t) => {
    const { run, calls, aiCalls } = fixture(t, { photo: { preview_path: null }, oversized: true });
    assert.equal((await run()).status, 502);
    assert.ok(calls.find((call) => call.url.pathname.endsWith('/owner/p.jpg')));
    assert.equal(aiCalls.length, 0);
});

test('a thumbnail is used when no preview exists', async (t) => {
    const { run, calls } = fixture(t, { photo: { preview_path: null, thumbnail_path: 'owner/thumbnails/p.jpg' } });
    assert.equal((await run()).status, 200);
    assert.ok(calls.some((call) => call.url.pathname.endsWith('/owner/thumbnails/p.jpg')));
});

test('completed analysis returns without another download, write, or AI call', async (t) => {
    const { run, calls, aiCalls } = fixture(t, { photo: { ai_analysis_status: 'complete', ai_tags: ['숲'] } });
    const response = await run();
    assert.equal((await response.json()).cached, true);
    assert.equal(calls.length, 2);
    assert.equal(aiCalls.length, 0);
});

test('failed and recently processing analyses cannot trigger repeated AI calls', async (t) => {
    for (const [status, expected] of [['failed', 422], ['processing', 409]]) {
        await t.test(status, async (subtest) => {
            const { run, calls, aiCalls } = fixture(subtest, { photo: { ai_analysis_status: status, ai_analyzed_at: new Date().toISOString() } });
            assert.equal((await run()).status, expected);
            assert.equal(calls.length, 2);
            assert.equal(aiCalls.length, 0);
        });
    }
});
