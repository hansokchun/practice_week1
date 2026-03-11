export async function onRequestGet(context) {
    const { env } = context;
    if (!env.DB) {
        return new Response(JSON.stringify({ error: "D1 database binding 'DB' is missing. Please check your Cloudflare Pages configuration." }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
    try {
        const { results } = await env.DB.prepare("SELECT * FROM photos").all();
        return new Response(JSON.stringify(results), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { env, request } = context;
    if (!env.DB) {
        return new Response(JSON.stringify({ error: "D1 database binding 'DB' is missing. Please check your Cloudflare Pages configuration." }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
    try {
        const photo = await request.json();
        await env.DB.prepare(
            "INSERT OR REPLACE INTO photos (id, url, date, title, description, lat, lng, liked, shared) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
            photo.id.toString(),
            photo.url,
            photo.date,
            photo.title,
            photo.description,
            photo.lat,
            photo.lng,
            photo.liked ? 1 : 0,
            photo.shared ? 1 : 0
        ).run();
        
        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

export async function onRequestDelete(context) {
    const { env, request } = context;
    if (!env.DB) {
        return new Response(JSON.stringify({ error: "D1 database binding 'DB' is missing. Please check your Cloudflare Pages configuration." }), { 
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id) return new Response("ID required", { status: 400 });
        
        await env.DB.prepare("DELETE FROM photos WHERE id = ?").bind(id).run();
        return new Response(JSON.stringify({ success: true }));
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
