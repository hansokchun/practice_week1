const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const origins = new Set(['https://ikkyee.com', 'https://www.ikkyee.com', 'https://practice-week1-cws.pages.dev', 'https://dev.practice-week1-cws.pages.dev']);

export function createAdminAccountsHandler(operations) {
    return async request => {
        const origin = request.headers.get('origin');
        const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
        if (origins.has(origin)) Object.assign(headers, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' });
        const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
        if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
        const header = request.headers.get('authorization') || '';
        const token = header.length <= 4096 ? /^Bearer ([A-Za-z0-9._~-]+)$/.exec(header)?.[1] : null;
        if (!token) return json({ error: 'unauthorized' }, 401);
        try {
            const actor = await operations.authenticate(token);
            if (!actor) return json({ error: 'unauthorized' }, 401);
            if (actor.app_metadata?.role !== 'admin' || new Date(actor.banned_until || 0).getTime() > Date.now()) return json({ error: 'forbidden' }, 403);
            const raw = await request.text();
            if (new TextEncoder().encode(raw).length > 4096) return json({ error: 'invalid_request' }, 400);
            let body;
            try { body = JSON.parse(raw); } catch { return json({ error: 'invalid_request' }, 400); }
            if (!body || Array.isArray(body) || typeof body !== 'object') return json({ error: 'invalid_request' }, 400);
            if (body.action === 'list') {
                const page = body.page ?? 1, search = String(body.search || '').trim(), status = body.status || 'all';
                if (!Number.isInteger(page) || page < 1 || page > 100000 || search.length > 100 || !['all', 'active', 'banned'].includes(status)) return json({ error: 'invalid_request' }, 400);
                return json(await operations.listAccounts({ page, search, status }));
            }
            if (!uuid(body.userId)) return json({ error: 'invalid_request' }, 400);
            if (body.action === 'detail') return json(await operations.inspectAccount(body.userId));
            if (body.action !== 'moderate') return json({ error: 'invalid_request' }, 400);
            const reason = String(body.reason || '').trim(), operation = body.operation;
            if (!['warning', 'ban', 'unban'].includes(operation) || reason.length < 5 || reason.length > 500 || !uuid(body.requestId)
                || (operation === 'ban' && ![24, 168, 720, 876000].includes(body.durationHours))) return json({ error: 'invalid_request' }, 400);
            if (body.userId === actor.id) return json({ error: 'protected_account' }, 403);
            const target = await operations.getAccount(body.userId);
            if (!target) return json({ error: 'not_found' }, 404);
            if (target.app_metadata?.role === 'admin') return json({ error: 'protected_account' }, 403);
            return json(await operations.moderateAccount({ actorId: actor.id, userId: body.userId, operation, reason, durationHours: operation === 'ban' ? body.durationHours : null, requestId: body.requestId }));
        } catch (error) {
            return json({ error: error?.code === 'moderation_busy' ? 'moderation_busy' : 'request_failed' }, error?.code === 'moderation_busy' ? 409 : 503);
        }
    };
}
