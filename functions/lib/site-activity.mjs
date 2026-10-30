const productionOrigins = new Set(['https://ikkyee.com', 'https://www.ikkyee.com']);
const knownBots = /bot|crawler|spider|slurp|facebookexternalhit|headlesschrome|lighthouse/i;

async function readSmallBody(message) {
    if (Number(message.headers.get('content-length')) > 128) throw new Error('payload_too_large');
    const reader = message.body?.getReader();
    if (!reader) return '';
    const bytes = new Uint8Array(128);
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (size + value.byteLength > bytes.byteLength) {
                await reader.cancel();
                throw new Error('payload_too_large');
            }
            bytes.set(value, size);
            size += value.byteLength;
        }
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, size));
    } finally {
        reader.releaseLock();
    }
}

export async function collectSiteActivity({ request, env, allowed }, fetchImpl = fetch) {
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    const respond = status => new Response(null, { status, headers });
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { ...headers, Allow: 'POST' } });
    if (allowed !== true || !productionOrigins.has(new URL(request.url).origin)) return respond(204);

    const key = env?.SITE_ANALYTICS_INGEST_KEY;
    const publishableKey = env?.SUPABASE_PUBLISHABLE_KEY;
    if (typeof key !== 'string' || new TextEncoder().encode(key).length < 32 || new TextEncoder().encode(key).length > 256
        || typeof publishableKey !== 'string' || !publishableKey.trim() || publishableKey.startsWith('sb_secret_')) return respond(204);
    let projectUrl;
    try {
        projectUrl = new URL(env.SUPABASE_URL);
        if (projectUrl.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(projectUrl.hostname)
            || projectUrl.port || projectUrl.username || projectUrl.password || projectUrl.pathname !== '/' || projectUrl.search || projectUrl.hash) return respond(204);
    } catch {
        return respond(204);
    }

    const origin = request.headers.get('origin');
    const fetchSite = request.headers.get('sec-fetch-site');
    if (origin !== new URL(request.url).origin || (fetchSite !== null && fetchSite !== 'same-origin')) return respond(403);
    if (knownBots.test(request.headers.get('user-agent') || '')) return respond(204);
    const contentType = (request.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase();
    if (!['text/plain', 'application/json'].includes(contentType)) return respond(415);

    let body;
    try {
        body = JSON.parse(await readSmallBody(request));
    } catch {
        return respond(400);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1
        || !Number.isInteger(body.seconds) || body.seconds < 1 || body.seconds > 3600) return respond(400);

    try {
        const response = await fetchImpl(`${projectUrl.origin}/rest/v1/rpc/record_site_activity`, {
            method: 'POST',
            headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_seconds: body.seconds, p_ingest_key: key }),
            signal: AbortSignal.timeout(3000), cache: 'no-store', redirect: 'manual'
        });
        if (!response.ok) {
            await response.body?.cancel();
            return respond(503);
        }
        const accepted = JSON.parse(await readSmallBody(response));
        return respond(typeof accepted === 'boolean' ? 204 : 503);
    } catch {
        return respond(503);
    }
}
